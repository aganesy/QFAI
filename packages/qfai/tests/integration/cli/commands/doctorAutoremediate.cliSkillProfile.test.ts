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

import { access, mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import * as autoremediateModule from "../../../../src/core/doctor/autoremediate.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-cli-${label}-`));
  tempDirs.push(dir);
  return dir;
}

// Capture and restore the CI env vars around each test. The doctor CLI
// computes `isCi = isCiEnvironment()` and forwards it to
// `runAutoremediate`, which short-circuits with `disabledInCi` when
// true. On GitHub Actions both `CI` and `GITHUB_ACTIONS` are `"true"`,
// so the install branch this test exercises would never fire —
// installCalls would be empty, and the assertion (`installCalls ===
// ["playwright"]`) would fail even though the CLI dispatch is correct.
// Forcing both signals to be unset during the test scope keeps the test
// about CLI wiring (not about the CI early-return behavior, which has
// its own cases in `doctorAutoremediate.ciOff.test.ts`).
const CI_ENV_KEYS = ["CI", "GITHUB_ACTIONS"] as const;
const savedCiEnv = new Map<(typeof CI_ENV_KEYS)[number], string | undefined>();

function setCiEnv(key: (typeof CI_ENV_KEYS)[number], value: string | undefined): void {
  if (value === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- literal union key
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

beforeEach(() => {
  for (const key of CI_ENV_KEYS) {
    savedCiEnv.set(key, process.env[key]);
    setCiEnv(key, undefined);
  }
});

afterEach(async () => {
  for (const key of CI_ENV_KEYS) {
    setCiEnv(key, savedCiEnv.get(key));
  }
  savedCiEnv.clear();
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

  // Pin the subdirectory-launch root resolution. When `doctor
  // --autoremediate` is invoked without `--root` (rootExplicit=false),
  // `runDoctor` must walk up via `findConfigRoot` to find the project
  // root before invoking the side-effect handlers. Pre-fix
  // `runAutoremediate` and `cleanStaleReviewPacks` received the raw
  // `options.root` (= cwd when --root was omitted), so a subdirectory
  // launch would archive `<subdir>/.qfai/review/...` and create
  // `<subdir>/qfai.config.yaml`. This test pins the resolution: a
  // subdirectory cwd with a parent-rooted qfai.config.yaml must
  // surface as the parent root in the captured `runAutoremediate`
  // options.
  it("resolves project root from a subdirectory when --root is omitted (rootExplicit=false)", async () => {
    const projectRoot = await newTempDir("subdir-resolve-parent");
    // Seed a qfai.config.yaml in the parent so findConfigRoot recognizes
    // it as the project root.
    await writeFile(
      path.join(projectRoot, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/specs\n",
      "utf-8",
    );
    const subdir = path.join(projectRoot, "nested", "deep");
    await mkdir(subdir, { recursive: true });

    const seenOptions: autoremediateModule.AutoremediateOptions[] = [];
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async (opts) => {
      seenOptions.push(opts);
      return { lines: [], disabledInCi: false };
    });

    const exit = await runDoctor({
      // `rootExplicit: false` and `root: <subdir>` simulates an
      // operator launching `qfai doctor --autoremediate` from the
      // subdirectory without passing `--root`.
      root: subdir,
      rootExplicit: false,
      format: "text",
      autoremediate: true,
      yes: true,
    });

    expect(exit).toBe(0);
    expect(seenOptions.length).toBe(1);
    // The captured root passed to runAutoremediate must be the parent
    // project root (where qfai.config.yaml lives), NOT the subdir
    // cwd. `findConfigRoot` returns the directory containing the
    // config; that's what `resolvedRoot` should be.
    const resolved = seenOptions[0]?.root;
    expect(resolved).toBe(projectRoot);
    expect(resolved).not.toBe(subdir);
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

  // Pin the "install phase skipped" operator note so the `--profile <skill>`
  // ↔ install-emission contract cannot silently drift. Pre-pin, the note
  // emission (`!options.skillProfile` in runDoctor) and the install branch
  // gate (`if (options.skill)` in runAutoremediate) could fall out of
  // lockstep without any test failing. Two assertions: (1) the note appears
  // on stdout when skillProfile is absent; (2) the note does NOT appear when
  // a valid skillProfile is passed. The `info()` logger writes to
  // process.stdout.write, so the capture target is stdout (not console.log).
  it("emits 'install phase skipped' on stdout when no skillProfile is set, and suppresses it when one is", async () => {
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async () => ({
      lines: [],
      disabledInCi: false,
    }));

    function captureStdout(): { restore: () => void; read: () => string } {
      const chunks: string[] = [];
      // vi.spyOn carries the overloaded signature of
      // `process.stdout.write`, so the implementation callback is
      // typed without needing a bare-`as` cast on the function shape
      // (CLAUDE.md "avoid bare `as`"). We accept `unknown` for the
      // first argument so all three overloads — `(chunk)`,
      // `(chunk, cb)`, `(chunk, encoding, cb)` — match; only the
      // chunk is observed.
      const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
        if (typeof chunk === "string") {
          chunks.push(chunk);
        } else if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk).toString("utf-8"));
        }
        return true;
      });
      return {
        restore: () => spy.mockRestore(),
        read: () => chunks.join(""),
      };
    }

    // Case A: no skillProfile → note expected on stdout.
    const rootA = await newTempDir("note-absent-profile");
    const capA = captureStdout();
    const exitA = await runDoctor({
      root: rootA,
      rootExplicit: true,
      format: "text",
      autoremediate: true,
      yes: true,
    });
    const stdoutA = capA.read();
    capA.restore();
    expect(exitA).toBe(0);
    expect(stdoutA).toMatch(
      /doctor --autoremediate: install phase skipped \(provide --profile <skill> to probe a skill manifest's runtimeDependencies\)\./,
    );

    // Case B: with skillProfile → note must NOT appear.
    const rootB = await newTempDir("note-present-profile");
    const manifestDir = path.join(rootB, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: [] }, null, 2),
      "utf-8",
    );
    const capB = captureStdout();
    const exitB = await runDoctor({
      root: rootB,
      rootExplicit: true,
      format: "text",
      autoremediate: true,
      skillProfile: "qfai-prototyping",
      yes: true,
    });
    const stdoutB = capB.read();
    capB.restore();
    expect(exitB).toBe(0);
    expect(stdoutB).not.toMatch(/doctor --autoremediate: install phase skipped/);
  });

  // The CI suppression is a safety guarantee of the doctor contract, and it
  // has to hold for the standard CI env vars, not for `CI` alone. A lane that
  // exports only `GITHUB_ACTIONS=true` used to remediate: the managed
  // `.gitignore` block was rewritten, then install / archive / config-fill all
  // ran. Both env vars must reach the same short-circuit.
  it.each(["CI", "GITHUB_ACTIONS"])(
    "suppresses autoremediation when %s=true is the only CI signal",
    async (envKey) => {
      const root = await newTempDir(`ci-${envKey.toLowerCase()}`);
      // A stale pack a live run would have archived, so the assertion is
      // about a real suppressed side effect, not just the log line.
      const oldTs = "20260401120000555";
      const oldDir = path.join(root, ".qfai", "review", `review-${oldTs}`);
      await mkdir(oldDir, { recursive: true });
      const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await utimes(oldDir, mtime, mtime);

      process.env[envKey] = "true";

      const seenOptions: autoremediateModule.AutoremediateOptions[] = [];
      const realRunAutoremediate = autoremediateModule.runAutoremediate;
      vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async (opts) => {
        seenOptions.push(opts);
        return realRunAutoremediate(opts);
      });

      const exit = await runDoctor({
        root,
        rootExplicit: true,
        format: "text",
        autoremediate: true,
      });

      expect(exit).toBe(0);
      expect(seenOptions[0]?.isCi).toBe(true);
      // No `.gitignore` written (that rewrite runs BEFORE the orchestrator).
      await expect(access(path.join(root, ".gitignore"))).rejects.toThrow();
      // Pack untouched.
      await expect(access(oldDir)).resolves.toBeUndefined();
    },
  );
});
