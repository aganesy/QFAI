// QFAI:AC-0003-0009-01
// QFAI:EX-0003-0009-01
//
// Integration: `qfai doctor --autoremediate --yes` orchestrates two
// remediations: install missing runtimeDependencies and prune stale
// validate run logs (--clean behavior). The npm install side effect is
// routed through a test runner so the test never touches the network.

import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";
import { pathExists } from "../../../helpers/pathExists.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-autoremediate-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("doctor --autoremediate fixes install + clean", () => {
  it("invokes install runner for missing deps, prunes a stale run log, leaves the config alone", async () => {
    const root = await newTempDir("fixes");

    // Seed skill manifest with one declared runtime dep, none installed.
    const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );

    // A run log past the TTL, outside the newest run kept.
    const configPath = path.join(root, "qfai.config.yaml");
    const config = "# user-authored\nreport:\n  keepLatestRuns: 1\n";
    await writeFile(configPath, config, "utf-8");
    const staleRun = path.join(root, ".qfai", "report", "run-20260401120000001");
    const freshRun = path.join(root, ".qfai", "report", "run-20260811120000002");
    await mkdir(staleRun, { recursive: true });
    await mkdir(freshRun, { recursive: true });
    const aged = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(staleRun, aged, aged);

    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
        // Simulate the install by seeding the package dir.
        await mkdir(path.join(root, "node_modules", name), { recursive: true });
      },
    });

    expect(summary.disabledInCi).toBe(false);
    expect(installCalls).toEqual(["playwright"]);
    expect(summary.installed).toContain("playwright");
    expect(summary.prunedRunLogs).toEqual(["run-20260401120000001"]);
    expect(await pathExists(staleRun)).toBe(false);
    expect(await pathExists(freshRun)).toBe(true);
    expect(await readFile(configPath, "utf-8")).toBe(config);
  });

  // Regression: "runtimeDependencies — all installed" is an affirmative
  // claim. It must not be printed for a skill whose manifest was never
  // located (a typo'd `--profile`, a renamed skill).
  it("says the manifest was not found instead of 'all installed' for an unresolvable skill", async () => {
    const root = await newTempDir("absent-manifest");

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "no-such-skill",
    });

    expect(summary.lines.join("\n")).not.toContain("runtimeDependencies — all installed");
    const line = summary.lines.find((entry) => entry.includes("runtimeDependencies"));
    expect(line).toBeDefined();
    expect(line).toMatch(/manifest not found/u);
    expect(line).toMatch(/no-such-skill/u);
  });

  // A skill "directory" that is really a regular file is a corrupted
  // tree, not a skill nobody authored a manifest for. Reporting it as
  // "not found" would send the user chasing a --profile typo.
  it("says the manifest is unreadable when the skill directory is a regular file", async () => {
    const root = await newTempDir("skilldir-file");
    const skillsRoot = path.join(root, ".qfai", "assistant", "skill");
    await mkdir(skillsRoot, { recursive: true });
    await writeFile(path.join(skillsRoot, "qfai-prototyping"), "not a directory", "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "qfai-prototyping",
    });

    expect(summary.lines.join("\n")).not.toContain("runtimeDependencies — all installed");
    const line = summary.lines.find((entry) => entry.includes("runtimeDependencies"));
    expect(line).toBeDefined();
    expect(line).toMatch(/unreadable/u);
    expect(line).not.toMatch(/not found/u);
  });

  it("still says 'all installed' when a real manifest declares zero deps", async () => {
    const root = await newTempDir("zero-deps");
    const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: [] }, null, 2),
      "utf-8",
    );

    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skipInstall: true,
      skill: "qfai-prototyping",
    });

    expect(summary.lines).toContain("autoremediate: runtimeDependencies — all installed");
  });
});
