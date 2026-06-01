// QFAI:SPEC-0006:TC-0006-0021
//
// Integration: `qfai doctor --profile <skill> --autoremediate` MUST
// thread the resolved `skillProfile` down into `runAutoremediate(...)`
// so the install phase (probe runtimeDependencies → run install runner)
// is actually reachable through the CLI dispatch path. Pre-fix the
// CLI command swallowed the skill option at the autoremediate boundary
// and the install branch was unreachable from the CLI — operators
// running with `--profile <skill> --autoremediate` saw clean +
// config-fill run but no install, contrary to the documented surface.
//
// This test seeds an unmet `runtimeDependencies: ["playwright"]` in a
// fake manifest, runs `runDoctor({skillProfile, autoremediate: true})`,
// and asserts the install-runner stub was invoked for the right dep.
// The install runner is exercised by going through `runDoctor` (CLI
// boundary) rather than calling `runAutoremediate` directly — the
// pre-fix bug lived in the CLI → autoremediate wire-up, not in the
// autoremediate impl itself.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import * as autoremediateModule from "../../../../src/core/doctor/autoremediate.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-cli-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("doctor CLI threads skillProfile into autoremediate", () => {
  it("invokes the install runner for the skill's runtimeDependencies via the CLI dispatch path", async () => {
    const root = await newTempDir("dispatch");
    const manifestDir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );

    // Spy on `runAutoremediate` and capture the options object the CLI
    // hands it. We delegate to the real impl via a stub install runner
    // so the seeded manifest is genuinely probed; that proves the CLI
    // dispatch passed `skill` through (pre-fix this option was dropped
    // and the install branch was unreachable).
    const installCalls: string[] = [];
    const seenOptions: autoremediateModule.AutoremediateOptions[] = [];
    const realRunAutoremediate = autoremediateModule.runAutoremediate;
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async (opts) => {
      seenOptions.push(opts);
      return realRunAutoremediate({
        ...opts,
        installRunner: async (name) => {
          installCalls.push(name);
          await mkdir(path.join(opts.root, "node_modules", name), { recursive: true });
        },
      });
    });

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath: path.join(root, ".qfai", "report", "doctor.json"),
      skillProfile: "qfai-prototyping",
      autoremediate: true,
      yes: true,
    });

    expect(exit).toBe(0);
    expect(seenOptions.length).toBe(1);
    expect(seenOptions[0]?.skill).toBe("qfai-prototyping");
    // Pre-fix `installCalls` was empty because `runAutoremediate` was
    // called without `skill` and skipped the install branch entirely.
    expect(installCalls).toEqual(["playwright"]);
  });

  it("omits skill when no skillProfile is set (legacy doctor flow unchanged)", async () => {
    const root = await newTempDir("legacy");

    const seenOptions: autoremediateModule.AutoremediateOptions[] = [];
    const realRunAutoremediate = autoremediateModule.runAutoremediate;
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async (opts) => {
      seenOptions.push(opts);
      return realRunAutoremediate({ ...opts, skipInstall: true });
    });

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath: path.join(root, ".qfai", "report", "doctor.json"),
      autoremediate: true,
      yes: true,
    });

    expect(exit).toBe(0);
    expect(seenOptions.length).toBe(1);
    expect(seenOptions[0]?.skill).toBeUndefined();
  });
});
