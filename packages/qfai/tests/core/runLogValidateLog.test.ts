/**
 * `validate.log`, the Validate Hard Gate evidence written by every
 * `qfai validate` run.
 *
 * Two properties the shipped Hard Gate depends on:
 *   - it lands under the project's configured `paths.outDir`, which is what
 *     the skill references — a project that moved `outDir` must still find it;
 *   - its `run_log:` line names the NEWEST run, even when two validates on the
 *     same root finish out of order.
 */

import { spawnSync } from "node:child_process";
import {
  link,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import {
  allocateRunDir,
  type PointerGuardOptions,
  publishLatestRunPointer,
  readRunStartedAtMs,
  type RunStart,
  VALIDATE_RUN_ID_LINE,
  VALIDATE_STARTED_AT_LINE,
  writeValidateRunLog,
} from "../../src/core/runLog.js";
import type { ValidationResult } from "../../src/core/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-runlog-"));
  tempDirs.push(dir);
  return dir;
}

function cleanResult(): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    issues: [],
    counts: { info: 0, warning: 0, error: 0 },
    traceability: {
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: 0,
      },
    },
  };
}

function configWithOutDir(outDir: string): QfaiConfig {
  return { ...defaultConfig, paths: { ...defaultConfig.paths, outDir } };
}

/** `run-<17-digit local timestamp>` for a given Date, matching runLog's format. */
function expectedRunId(date: Date): string {
  const pad = (n: number, width = 2): string => `${n}`.padStart(width, "0");
  return `run-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds(), 3)}`;
}

async function readValidateLog(root: string, outDir: string): Promise<string> {
  return readFile(path.join(root, outDir, "validate.log"), "utf-8");
}

/** A run root holding one run directory, with the pointer and guard paths beside it. */
async function guardFixture(): Promise<{
  runRoot: string;
  pointerPath: string;
  lockPath: string;
  run: RunStart;
}> {
  const runRoot = await newTempDir();
  const pointerPath = path.join(runRoot, "validate.log");
  const run = await allocateRun(runRoot, new Date("2026-05-05T10:00:00.000Z"));
  return { runRoot, pointerPath, lockPath: `${pointerPath}.lock`, run };
}

/** Allocate a run directory under `runRoot` the way a run does. */
async function allocateRun(runRoot: string, startedAt: Date): Promise<RunStart> {
  const { runId } = await allocateRunDir(runRoot, startedAt);
  return { runId, startedAtMs: startedAt.getTime() };
}

/** The pointer text for `run`, in the lines `validate.log` names a run with. */
function pointerText(run: RunStart): string {
  return `- run_id: ${run.runId}\n- started_at: ${new Date(run.startedAtMs).toISOString()}\n`;
}

async function publishPointer(
  runRoot: string,
  pointerPath: string,
  run: RunStart,
  overrides: {
    guard?: PointerGuardOptions;
    buildContents?: () => string | Promise<string>;
  } = {},
): Promise<void> {
  await publishLatestRunPointer({
    runRoot,
    run,
    pointerPath,
    runIdLine: VALIDATE_RUN_ID_LINE,
    startedAtLine: VALIDATE_STARTED_AT_LINE,
    readStartedAtMs: readRunStartedAtMs,
    buildContents: overrides.buildContents ?? (() => pointerText(run)),
    ...(overrides.guard === undefined ? {} : { guard: overrides.guard }),
  });
}

describe("validate.log placement", () => {
  it("writes under the default outDir and points at the run it just created", async () => {
    const root = await newTempDir();
    const startedAt = new Date("2026-05-05T10:00:00.000Z");
    const { runId, reportDir } = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt,
    });
    const log = await readValidateLog(root, defaultConfig.paths.outDir);
    expect(log).toContain(`- run_id: ${runId}`);
    expect(log).toContain(`- run_log: ${path.relative(root, reportDir).replace(/\\/g, "/")}`);
    expect(log).toContain("- status: pass");
  });

  it("follows a non-default paths.outDir", async () => {
    // The shipped Hard Gate text names `.qfai/report/validate.log` as the
    // default; a project that moved `outDir` must find the evidence under its
    // own directory rather than lose it.
    const root = await newTempDir();
    const config = configWithOutDir(".qfai/out");
    const { runId } = await writeValidateRunLog({
      root,
      config,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });
    expect(await readValidateLog(root, ".qfai/out")).toContain(`- run_id: ${runId}`);
    await expect(readValidateLog(root, ".qfai/report")).rejects.toThrow();
  });
});

describe("validate.log freshness under out-of-order completion", () => {
  // These cases drive `writeValidateRunLog` sequentially with out-of-order
  // START times, which is the ordering a real overlap produces. They do not
  // interleave two in-flight runs at the fs level.
  it("does not let an older run overwrite a newer pointer", async () => {
    // Run-log directory names come from the run's START time, so a long run
    // started earlier can finish later. Writing unconditionally would leave the
    // pointer on the older run while the newer run-* sits beside it.
    const root = await newTempDir();
    const newer = new Date("2026-05-05T10:00:05.000Z");
    const older = new Date("2026-05-05T10:00:00.000Z");

    const newerRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: newer,
    });
    const olderRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: older,
    });

    expect(olderRun.runId < newerRun.runId).toBe(true);
    const log = await readValidateLog(root, defaultConfig.paths.outDir);
    expect(log).toContain(`- run_id: ${newerRun.runId}`);
    expect(log).not.toContain(`- run_id: ${olderRun.runId}`);
  });

  it("lets a newer run replace the pointer", async () => {
    const root = await newTempDir();
    await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });
    const newerRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:05.000Z"),
    });
    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(
      `- run_id: ${newerRun.runId}`,
    );
  });

  it("defers to a newer run-* directory even when no validate.log names it", async () => {
    // The pointer decision is keyed on the run-* directory listing, not on
    // validate.log alone: a newer run allocates its directory at START but
    // writes the log at END, so during that window only the directory exists.
    // An older run finishing inside that window must not claim the pointer.
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    const newerStart = new Date("2026-05-05T10:00:05.000Z");
    const newerRunId = expectedRunId(newerStart);
    await mkdir(path.join(outDir, newerRunId), { recursive: true });
    await utimes(path.join(outDir, newerRunId), newerStart, newerStart);

    const olderRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });

    expect(olderRun.runId < newerRunId).toBe(true);
    await expect(readValidateLog(root, defaultConfig.paths.outDir)).rejects.toThrow();
  });

  it("holds the guard from the freshness check to the write", async () => {
    // A delayed older run passes the freshness check, a newer run is then
    // allocated and publishes, and only after that does the older run write.
    // Checked and written separately, the older run's write lands last and the
    // pointer names the older run.
    const { runRoot, pointerPath, run: older } = await guardFixture();
    let newerPublish: Promise<void> | undefined;
    let newer: RunStart | undefined;

    await publishPointer(runRoot, pointerPath, older, {
      buildContents: async () => {
        const allocated = await allocateRun(runRoot, new Date("2026-05-05T10:00:05.000Z"));
        newer = allocated;
        newerPublish = publishPointer(runRoot, pointerPath, allocated);
        // Long enough for an unguarded newer run to finish its own write.
        await new Promise((resolve) => setTimeout(resolve, 200));
        return pointerText(older);
      },
    });
    await newerPublish;

    expect(newer).toBeDefined();
    if (newer === undefined) return;
    expect(await readFile(pointerPath, "utf-8")).toBe(pointerText(newer));
    expect(await readdir(runRoot)).not.toContain("validate.log.lock");
  });

  it("takes over an old guard that names no process", async () => {
    const { runRoot, pointerPath, lockPath, run } = await guardFixture();
    await writeFile(lockPath, "half-written", "utf-8");
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(lockPath, longAgo, longAgo);

    await publishPointer(runRoot, pointerPath, run);

    expect(await readFile(pointerPath, "utf-8")).toBe(pointerText(run));
    expect(await readdir(runRoot)).not.toContain("validate.log.lock");
  });

  it("takes over a fresh guard whose process has ended at once", async () => {
    const { runRoot, pointerPath, lockPath, run } = await guardFixture();
    const endedPid = spawnSync(process.execPath, ["-e", ""]).pid;
    await writeFile(lockPath, JSON.stringify({ pid: endedPid, token: "ended" }), "utf-8");

    await publishPointer(runRoot, pointerPath, run, { guard: { waitMs: 0 } });

    expect(await readFile(pointerPath, "utf-8")).toBe(pointerText(run));
    expect(await readdir(runRoot)).not.toContain("validate.log.lock");
  });

  it("waits on an old guard whose process still exists, then names the file", async () => {
    const { runRoot, pointerPath, lockPath, run } = await guardFixture();
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, token: "live" }), "utf-8");
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(lockPath, longAgo, longAgo);

    await expect(
      publishPointer(runRoot, pointerPath, run, { guard: { waitMs: 100 } }),
    ).rejects.toThrow(
      `${lockPath} is held by another run. Remove it if no qfai run is in progress, and run again.`,
    );
    await expect(readFile(pointerPath, "utf-8")).rejects.toThrow();
    expect(await readFile(lockPath, "utf-8")).toContain('"live"');
  });

  it("refuses a directory at the guard's name with the same guidance", async () => {
    const { runRoot, pointerPath, lockPath, run } = await guardFixture();
    await mkdir(lockPath);

    await expect(publishPointer(runRoot, pointerPath, run)).rejects.toThrow(
      `${lockPath} is not a file. Remove it if no qfai run is in progress, and run again.`,
    );
  });

  it("on Windows, retries a guard create refused while the old guard is deleted", async () => {
    const { runRoot, pointerPath, run } = await guardFixture();
    const refusals = ["EPERM", "EACCES"];
    await publishPointer(runRoot, pointerPath, run, {
      guard: {
        platform: "win32",
        createGuard: async (guardPath, contents) => {
          const code = refusals.shift();
          if (code !== undefined) throw Object.assign(new Error(code), { code });
          await writeFile(guardPath, contents, { encoding: "utf-8", flag: "wx" });
        },
      },
    });

    expect(refusals).toEqual([]);
    expect(await readFile(pointerPath, "utf-8")).toBe(pointerText(run));
  });

  it("elsewhere, stops on a guard create refused with EACCES", async () => {
    const { runRoot, pointerPath, run } = await guardFixture();
    await expect(
      publishPointer(runRoot, pointerPath, run, {
        guard: {
          platform: "linux",
          createGuard: async () => {
            throw Object.assign(new Error("EACCES"), { code: "EACCES" });
          },
        },
      }),
    ).rejects.toThrow("EACCES");
  });

  it("takes the pointer from an in-flight run that started earlier", async () => {
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    const earlierStart = new Date("2026-05-05T10:00:00.000Z");
    const earlierRunId = expectedRunId(earlierStart);
    await mkdir(path.join(outDir, earlierRunId), { recursive: true });
    await utimes(path.join(outDir, earlierRunId), earlierStart, earlierStart);

    const laterRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:05.000Z"),
    });

    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(
      `- run_id: ${laterRun.runId}`,
    );
  });

  it("lets the later of two overlapping runs take the pointer whichever finishes first", async () => {
    // Each run's directory exists before its start is recorded in it. Judged by
    // the time the directory was made, each run could take the other as newer
    // and neither would write the pointer.
    for (const laterFinishesFirst of [true, false]) {
      const root = await newTempDir();
      const outDir = path.join(root, defaultConfig.paths.outDir);
      await mkdir(outDir, { recursive: true });
      const earlierStart = new Date("2026-05-05T10:00:00.000Z");
      const laterStart = new Date("2026-05-05T10:00:10.000Z");
      const inFlightStart = laterFinishesFirst ? earlierStart : laterStart;
      const finishingStart = laterFinishesFirst ? laterStart : earlierStart;
      const inFlight = await allocateRunDir(outDir, inFlightStart);

      const finishing = await writeValidateRunLog({
        root,
        config: defaultConfig,
        result: cleanResult(),
        startedAt: finishingStart,
      });

      if (laterFinishesFirst) {
        expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(
          `- run_id: ${finishing.runId}`,
        );
      } else {
        await expect(readValidateLog(root, defaultConfig.paths.outDir)).rejects.toThrow();
        expect(inFlight.runId > finishing.runId).toBe(true);
      }
    }
  });

  // A daylight-saving fall-back repeats an hour of local time, so a run that
  // starts after it can carry a run id that sorts before an earlier run's. The
  // fixtures below give the earlier run the larger id, which is that case.
  it("points at the run that started last when its run id sorts first", async () => {
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    const earlierRunId = "run-99991231235959999";
    await mkdir(path.join(outDir, earlierRunId), { recursive: true });
    await writeFile(
      path.join(outDir, earlierRunId, "run.json"),
      `${JSON.stringify({ run_id: earlierRunId, started_at: "2026-05-05T10:00:00.000Z" })}\n`,
      "utf-8",
    );
    await writeFile(
      path.join(outDir, "validate.log"),
      `- run_id: ${earlierRunId}\n- started_at: 2026-05-05T10:00:00.000Z\n`,
      "utf-8",
    );

    const laterRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:05.000Z"),
    });

    expect(laterRun.runId < earlierRunId).toBe(true);
    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(
      `- run_id: ${laterRun.runId}`,
    );
  });

  it("defers to a run that started later even when its run id sorts first", async () => {
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    const laterRunId = "run-00010101000000000";
    await mkdir(path.join(outDir, laterRunId), { recursive: true });
    await writeFile(
      path.join(outDir, laterRunId, "run.json"),
      `${JSON.stringify({ run_id: laterRunId, started_at: "2026-05-05T10:00:05.000Z" })}\n`,
      "utf-8",
    );

    const earlierRun = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });

    expect(earlierRun.runId > laterRunId).toBe(true);
    await expect(readValidateLog(root, defaultConfig.paths.outDir)).rejects.toThrow();
  });

  it("keeps a pointer whose run started later even when its run id sorts first", async () => {
    // The newer run's directory is gone, so only the pointer's own start time
    // can show it is newer.
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    await mkdir(outDir, { recursive: true });
    const pointer = "- run_id: run-00010101000000000\n- started_at: 2026-05-05T10:00:05.000Z\n";
    await writeFile(path.join(outDir, "validate.log"), pointer, "utf-8");

    await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });

    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toBe(pointer);
  });

  it("self-heals from an unparseable existing log", async () => {
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "validate.log"), "hand-edited garbage\n", "utf-8");
    const startedAt = new Date("2026-05-05T10:00:00.000Z");
    const { runId } = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt,
    });
    expect(runId).toBe(expectedRunId(startedAt));
    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(`- run_id: ${runId}`);
  });
});

/** Link `linkPath` to the directory `target`: a junction on Windows, which needs no privilege. */
async function linkDirectory(target: string, linkPath: string): Promise<void> {
  await symlink(target, linkPath, process.platform === "win32" ? "junction" : "dir");
}

/** Link `linkPath` to the file `target`, or `false` where the platform refuses a file link. */
async function tryLinkFile(target: string, linkPath: string): Promise<boolean> {
  try {
    await symlink(target, linkPath, "file");
    return true;
  } catch {
    return false;
  }
}

function runDirsIn(entries: string[]): string[] {
  return entries.filter((name) => name.startsWith("run-"));
}

// BR-CLI-0014-0297
describe("run-log destinations reached through a link", () => {
  // QFAI:EX-0001-0039-53
  it("refuses an outDir that is a link and writes nothing through it", async () => {
    const root = await newTempDir();
    const outside = await newTempDir();
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await linkDirectory(outside, path.join(root, ".qfai", "report"));

    await expect(
      writeValidateRunLog({
        root,
        config: defaultConfig,
        result: cleanResult(),
        startedAt: new Date("2026-05-05T10:00:00.000Z"),
      }),
    ).rejects.toThrow(".qfai/report is a symbolic link or junction");
    expect(await readdir(outside)).toEqual([]);
  });

  // QFAI:EX-0001-0039-53
  it("refuses a directory between the root and outDir that is a link", async () => {
    const root = await newTempDir();
    const outside = await newTempDir();
    await linkDirectory(outside, path.join(root, ".qfai"));

    await expect(
      writeValidateRunLog({
        root,
        config: defaultConfig,
        result: cleanResult(),
        startedAt: new Date("2026-05-05T10:00:00.000Z"),
      }),
    ).rejects.toThrow(".qfai is a symbolic link or junction");
    expect(await readdir(outside)).toEqual([]);
  });

  // QFAI:EX-0001-0039-53
  it("refuses a validate.log that is a link and leaves its target as it was", async (ctx) => {
    const root = await newTempDir();
    const outside = await newTempDir();
    const target = path.join(outside, "victim.txt");
    await writeFile(target, "keep\n", "utf-8");
    const outDir = path.join(root, defaultConfig.paths.outDir);
    await mkdir(outDir, { recursive: true });
    if (!(await tryLinkFile(target, path.join(outDir, "validate.log")))) ctx.skip();

    await expect(
      writeValidateRunLog({
        root,
        config: defaultConfig,
        result: cleanResult(),
        startedAt: new Date("2026-05-05T10:00:00.000Z"),
      }),
    ).rejects.toThrow(".qfai/report/validate.log is a symbolic link or junction");
    expect(await readFile(target, "utf-8")).toBe("keep\n");
    expect(runDirsIn(await readdir(outDir))).toEqual([]);
  });

  // QFAI:EX-0001-0039-53
  it("replaces validate.log with a new file rather than writing through the old one", async () => {
    // A hard link shares the old file's inode: a write in place would change
    // the other name as well, so an unchanged twin shows the log was replaced.
    const root = await newTempDir();
    const outDir = path.join(root, defaultConfig.paths.outDir);
    await mkdir(outDir, { recursive: true });
    const logPath = path.join(outDir, "validate.log");
    await writeFile(logPath, "old\n", "utf-8");
    const twin = path.join(root, "twin.log");
    await link(logPath, twin);

    const { runId } = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result: cleanResult(),
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });

    expect(await readValidateLog(root, defaultConfig.paths.outDir)).toContain(`- run_id: ${runId}`);
    expect(await readFile(twin, "utf-8")).toBe("old\n");
    const leftovers = (await readdir(outDir)).filter(
      (name) => name !== "validate.log" && !name.startsWith("run-"),
    );
    expect(leftovers).toEqual([]);
  });
});

describe("run-log traceability nodes", () => {
  it("records every story-tree ID a reference names, business flows included", async () => {
    const root = await newTempDir();
    const result = cleanResult();
    result.issues = [
      {
        code: "QFAI-TEST-001",
        severity: "error",
        category: "canonical",
        message: "cites several IDs",
        file: path.join(root, ".qfai", "spec", "story.md"),
        refs: [
          "BF-0001 owns US-0001-0002, which AC-0001-0002-01 and EX-0001-0002-03 refine",
          "BR-CLI-0014-0092",
          "DEC-0007; OQ-0002",
          // A malformed ID names no node, not the shorter ID it starts with.
          "US-0001-0003- and AC-0001-0002-1",
        ],
      },
    ];
    const { reportDir } = await writeValidateRunLog({
      root,
      config: defaultConfig,
      result,
      startedAt: new Date("2026-05-05T10:00:00.000Z"),
    });
    const traceability: unknown = JSON.parse(
      await readFile(path.join(reportDir, "traceability.json"), "utf-8"),
    );
    const nodePath = ".qfai/spec/story.md";
    expect(traceability).toEqual({
      schema_version: 1,
      nodes: [
        { id: "AC-0001-0002-01", layer: "AC", path: nodePath },
        { id: "BF-0001", layer: "BF", path: nodePath },
        { id: "BR-CLI-0014-0092", layer: "BR", path: nodePath },
        { id: "DEC-0007", layer: "DEC", path: nodePath },
        { id: "EX-0001-0002-03", layer: "EX", path: nodePath },
        { id: "OQ-0002", layer: "OQ", path: nodePath },
        { id: "US-0001-0002", layer: "US", path: nodePath },
      ],
    });
  });
});
