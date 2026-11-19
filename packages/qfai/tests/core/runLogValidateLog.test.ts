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
  publishLatestRunPointer,
  VALIDATE_RUN_ID_LINE,
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
    const newerRunId = expectedRunId(new Date("2026-05-05T10:00:05.000Z"));
    await mkdir(path.join(outDir, newerRunId), { recursive: true });

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
    const runRoot = await newTempDir();
    const pointerPath = path.join(runRoot, "validate.log");
    const olderRunId = expectedRunId(new Date("2026-05-05T10:00:00.000Z"));
    const newerRunId = expectedRunId(new Date("2026-05-05T10:00:05.000Z"));
    await mkdir(path.join(runRoot, olderRunId));
    let newerPublish: Promise<void> | undefined;
    const pointer = (runId: string): string => `- run_id: ${runId}\n`;

    await publishLatestRunPointer({
      runRoot,
      runId: olderRunId,
      pointerPath,
      runIdLine: VALIDATE_RUN_ID_LINE,
      buildContents: async () => {
        await mkdir(path.join(runRoot, newerRunId));
        newerPublish = publishLatestRunPointer({
          runRoot,
          runId: newerRunId,
          pointerPath,
          runIdLine: VALIDATE_RUN_ID_LINE,
          buildContents: () => pointer(newerRunId),
        });
        // Long enough for an unguarded newer run to finish its own write.
        await new Promise((resolve) => setTimeout(resolve, 200));
        return pointer(olderRunId);
      },
    });
    await newerPublish;

    expect(await readFile(pointerPath, "utf-8")).toBe(pointer(newerRunId));
    expect(await readdir(runRoot)).not.toContain("validate.log.lock");
  });

  it("takes over a guard a crashed run left behind", async () => {
    const runRoot = await newTempDir();
    const pointerPath = path.join(runRoot, "validate.log");
    const lockPath = `${pointerPath}.lock`;
    const runId = expectedRunId(new Date("2026-05-05T10:00:00.000Z"));
    await mkdir(path.join(runRoot, runId));
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, token: "left-behind" }), "utf-8");
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(lockPath, longAgo, longAgo);

    await publishLatestRunPointer({
      runRoot,
      runId,
      pointerPath,
      runIdLine: VALIDATE_RUN_ID_LINE,
      buildContents: () => `- run_id: ${runId}\n`,
    });

    expect(await readFile(pointerPath, "utf-8")).toBe(`- run_id: ${runId}\n`);
    expect(await readdir(runRoot)).not.toContain("validate.log.lock");
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
