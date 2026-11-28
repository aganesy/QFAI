//
// Integration: `qfai doctor --profile <skill> --autoremediate` MUST
// thread the resolved `skillProfile` down into `runAutoremediate(...)`
// so the install phase (probe runtimeDependencies → run install runner)
// is actually reachable through the CLI dispatch path. Pre-fix the
// CLI command swallowed the skill option at the autoremediate boundary
// and the install branch was unreachable from the CLI — operators
// running with `--profile <skill> --autoremediate` saw the clean run
// but no install, contrary to the documented surface.
//
// This test seeds an unmet `runtimeDependencies: ["playwright"]` in a
// fake manifest, runs `runDoctor({skillProfile, autoremediate: true})`,
// and asserts the install-runner stub was invoked for the right dep.
// The install runner is exercised by going through `runDoctor` (CLI
// boundary) rather than calling `runAutoremediate` directly — the
// pre-fix bug lived in the CLI → autoremediate wire-up, not in the
// autoremediate impl itself.

import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import * as autoremediateModule from "../../../../src/core/doctor/autoremediate.js";
import { SKILL_INTEGRATION_DIRS } from "../../../../src/core/init/integrationDirs.js";
import { recordAssistantVersion } from "../../../helpers/assistantVersion.js";
import {
  canCreateSymlink,
  SHIPPED_SKILL,
  wireProject,
} from "../../../helpers/integrationWrapperFixture.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-cli-${label}-`));
  tempDirs.push(dir);
  // A project carries the document-schema lane; doctor reports its absence as an error.
  await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
  await writeFile(path.join(dir, ".github", "workflows", "qfai-docs.yml"), "name: qfai-docs\n");
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

// QFAI:EX-0003-0009-01
describe("doctor CLI threads skillProfile into autoremediate", () => {
  // QFAI:AC-0003-0009-07
  // QFAI:EX-0003-0009-19
  it("leaves a converged repair pass unchanged", async (test) => {
    const root = await newTempDir("converged");
    if (!(await canCreateSymlink(root))) test.skip();
    await wireProject(root);
    await recordAssistantVersion(root);

    const skill = path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL);
    await writeFile(
      path.join(skill, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }),
      "utf-8",
    );
    await mkdir(path.join(root, "node_modules", "playwright"), { recursive: true });
    const wrapper = path.join(root, ".claude", "skills", SHIPPED_SKILL);
    const backup = wrapper + ".qfai-repair-4242";
    const backupNote = path.join(backup, "project-note.md");
    const report = path.join(root, ".qfai", "report");
    const runLog = path.join(report, "run-20260401120000001");
    const newestRun = path.join(report, "run-20260402120000002");
    const runNote = path.join(runLog, "notes.md");
    await mkdir(backup);
    await mkdir(runLog, { recursive: true });
    await mkdir(newestRun);
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "report:\n  staleTtlDays: 14\n  keepLatestRuns: 1\n",
      "utf-8",
    );
    await writeFile(backupNote, "Owned by the project.\n", "utf-8");
    await writeFile(runNote, "Recent run.\n", "utf-8");
    const recent = new Date(Date.now() - 60_000);
    await utimes(runLog, recent, recent);

    const installRunner = vi.fn<autoremediateModule.InstallRunner>().mockResolvedValue(undefined);
    const real = autoremediateModule.runAutoremediate;
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation((options) =>
      real({ ...options, installRunner }),
    );
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const run = (): Promise<number> =>
      runDoctor({
        root,
        rootExplicit: true,
        autoremediate: true,
        skillProfile: SHIPPED_SKILL,
        yes: true,
        format: "json",
        failOn: "never",
      });
    expect(await run()).toBe(0);

    const ignore = path.join(root, ".gitignore");
    const files = [ignore, backupNote, runNote];
    const directories = [backup, runLog, newestRun];
    const wrappers = SKILL_INTEGRATION_DIRS.map((dir) =>
      path.join(root, ...dir.split("/"), SHIPPED_SKILL),
    );
    // An old file timestamp makes a same-content write visible on the repeat pass.
    const earlier = new Date(2020, 0, 1);
    await Promise.all(files.map((file) => utimes(file, earlier, earlier)));

    const metadata = async (target: string) => {
      const { dev, ino, mtimeNs } = await lstat(target, { bigint: true });
      return { dev, ino, mtimeNs };
    };
    const snapshot = async () => ({
      files: await Promise.all(
        files.map(async (file) => ({
          path: path.relative(root, file),
          bytes: await readFile(file),
          ...(await metadata(file)),
        })),
      ),
      wrappers: await Promise.all(
        wrappers.map(async (link) => ({
          path: path.relative(root, link),
          target: await readlink(link),
          ...(await metadata(link)),
        })),
      ),
      directories: await Promise.all(
        directories.map(async (dir) => ({
          path: path.relative(root, dir),
          entries: (await readdir(dir)).sort(),
          ...(await metadata(dir)),
        })),
      ),
    });
    const before = await snapshot();
    stderr.mockClear();
    expect(await run()).toBe(0);

    const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(output).toContain("autoremediate: runtimeDependencies — all installed");
    expect(output).toContain("autoremediate: run logs pruned=0, in-ttl=1, kept-latest=1");
    expect(installRunner).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual(before);
  });

  it("invokes the install runner for the skill's runtimeDependencies via the CLI dispatch path", async () => {
    const root = await newTempDir("dispatch");
    const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await recordAssistantVersion(root);
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

  // A failed `npm install` leaves the remediation the operator asked for
  // incomplete. Like a failed run-log removal it is not a diagnostic
  // severity, so `--fail-on never` must not turn it into exit 0.
  // QFAI:EX-0003-0009-13
  it("exits 1 when an install fails, even under --fail-on never", async () => {
    // QFAI:AC-0003-0009-05
    const root = await newTempDir("install-failed");
    const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await recordAssistantVersion(root);
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );

    let summary: autoremediateModule.AutoremediateSummary | undefined;
    const realRunAutoremediate = autoremediateModule.runAutoremediate;
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async (opts) => {
      summary = await realRunAutoremediate({
        ...opts,
        installRunner: async (name) => {
          throw new Error(`npm install ${name} exited with code 1`);
        },
      });
      return summary;
    });

    // In JSON mode doctor writes the remediation lines to stderr, so the
    // operator sees the failure there; the chunk alone is observed.
    const stderrChunks: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      if (typeof chunk === "string") {
        stderrChunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        stderrChunks.push(Buffer.from(chunk).toString("utf-8"));
      }
      return true;
    });
    let exit: number;
    try {
      exit = await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath: path.join(root, ".qfai", "report", "doctor.json"),
        skillProfile: "qfai-prototyping",
        autoremediate: true,
        yes: true,
        failOn: "never",
      });
    } finally {
      stderrSpy.mockRestore();
    }

    expect(stderrChunks.join("")).toContain("install failed for playwright");
    expect(summary?.lines).toContain(
      "autoremediate: install failed for playwright: npm install playwright exited with code 1",
    );
    expect(summary?.failedInstalls).toEqual(["playwright"]);
    expect(summary?.installed).toEqual([]);
    expect(exit).toBe(1);
  });

  // Pin the subdirectory-launch root resolution. When `doctor
  // --autoremediate` is invoked without `--root` (rootExplicit=false),
  // `runDoctor` must walk up via `findConfigRoot` to find the project
  // root before invoking the side-effect handlers. Pre-fix
  // `runAutoremediate` received the raw `options.root` (= cwd when --root
  // was omitted), so a subdirectory launch would prune and install under
  // `<subdir>`. This test pins the resolution: a
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
      return { lines: [], disabledInCi: false, failedRunLogPrunes: [], failedInstalls: [] };
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

  // QFAI:EX-0003-0009-06
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
  // QFAI:EX-0003-0009-06
  it("emits 'install phase skipped' on stdout when no skillProfile is set, and suppresses it when one is", async () => {
    // QFAI:AC-0003-0009-03
    vi.spyOn(autoremediateModule, "runAutoremediate").mockImplementation(async () => ({
      lines: [],
      disabledInCi: false,
      failedRunLogPrunes: [],
      failedInstalls: [],
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
    const manifestDir = path.join(rootB, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await recordAssistantVersion(rootB);
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
  // `.gitignore` block was rewritten, then install and the prune both ran.
  // Both env vars must reach the same short-circuit.
  it.each(["CI", "GITHUB_ACTIONS"])(
    "suppresses autoremediation when %s=true is the only CI signal",
    async (envKey) => {
      const root = await newTempDir(`ci-${envKey.toLowerCase()}`);
      // A stale run log a live run would have pruned, so the assertion is
      // about a real suppressed side effect, not just the log line.
      await writeFile(path.join(root, "qfai.config.yaml"), "report:\n  keepLatestRuns: 1\n");
      const oldDir = path.join(root, ".qfai", "report", "run-20260401120000555");
      await mkdir(oldDir, { recursive: true });
      await mkdir(path.join(root, ".qfai", "report", "run-20260811120000556"), { recursive: true });
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
      // Run log untouched.
      await expect(access(oldDir)).resolves.toBeUndefined();
    },
  );
});
