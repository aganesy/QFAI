// Unit: `cleanStaleRunLogs` bounds the `<outDir>/run-*` growth that
// `qfai validate` produces (one directory per invocation, removed by
// nothing) while keeping the newest runs — which `validate.log`'s
// `run_log:` pointer names — unreachable by the pruner.

import { access, mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { cleanStaleRunLogs } from "../../../../src/core/doctor/cleanRunLogs.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-clean-runlogs-${label}-`));
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

async function seedRunLog(
  root: string,
  runId: string,
  ageDays: number,
  startedAt?: string,
): Promise<string> {
  const dir = path.join(root, ".qfai", "report", runId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "run.json"),
    startedAt === undefined
      ? "{}\n"
      : `${JSON.stringify({ run_id: runId, started_at: startedAt })}\n`,
    "utf-8",
  );
  const mtime = new Date(Date.now() - ageDays * DAY_MS);
  await utimes(dir, mtime, mtime);
  return dir;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("cleanStaleRunLogs — TTL + keep-latest pruning of validate run logs", () => {
  it("removes a TTL-expired run beyond the keep-latest floor", async () => {
    const root = await newTempDir("prune");
    const stale = await seedRunLog(root, "run-20260401120000001", 30);
    const fresh = await seedRunLog(root, "run-20260811120000002", 0);

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(result.retainedLatest.map((entry) => entry.runId)).toEqual(["run-20260811120000002"]);
    expect(await exists(stale)).toBe(false);
    expect(await exists(fresh)).toBe(true);
  });

  it("keeps the newest N runs regardless of age so run_log: can never dangle", async () => {
    const root = await newTempDir("keep-latest");
    const older = await seedRunLog(root, "run-20260401120000001", 90);
    const newer = await seedRunLog(root, "run-20260402120000002", 89);

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 5 });

    expect(result.removed).toEqual([]);
    expect(result.retainedLatest).toHaveLength(2);
    expect(await exists(older)).toBe(true);
    expect(await exists(newer)).toBe(true);
  });

  it("dry-run reports the plan without removing anything", async () => {
    const root = await newTempDir("dry-run");
    const stale = await seedRunLog(root, "run-20260401120000001", 30);
    await seedRunLog(root, "run-20260811120000002", 0);

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1, dryRun: true });

    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(await exists(stale)).toBe(true);
  });

  it("ttlDays: 0 opts out entirely (audit-evidence projects keep every run)", async () => {
    const root = await newTempDir("opt-out");
    const stale = await seedRunLog(root, "run-20260401120000001", 365);
    await seedRunLog(root, "run-20260811120000002", 364);

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1, ttlDays: 0 });

    expect(result.removed).toEqual([]);
    expect(result.skippedInTtl).toHaveLength(1);
    expect(await exists(stale)).toBe(true);
  });

  it("never touches the sibling artifacts an operator greps", async () => {
    const root = await newTempDir("siblings");
    await seedRunLog(root, "run-20260401120000001", 30);
    await seedRunLog(root, "run-20260811120000002", 0);
    const reportRoot = path.join(root, ".qfai", "report");
    await writeFile(
      path.join(reportRoot, "validate.log"),
      "- run_log: .qfai/report/run-20260811120000002\n",
      "utf-8",
    );
    await writeFile(path.join(reportRoot, "validate.json"), "{}\n", "utf-8");
    await mkdir(path.join(reportRoot, "specs-coverage"), { recursive: true });

    await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    const remaining = await readdir(reportRoot);
    expect(remaining.sort()).toEqual([
      "run-20260811120000002",
      "specs-coverage",
      "validate.json",
      "validate.log",
    ]);
  });

  it("returns an empty plan when outDir does not exist yet", async () => {
    const root = await newTempDir("missing");
    const result = await cleanStaleRunLogs(root, defaultConfig, {});
    expect(result.removed).toEqual([]);
    expect(result.retainedLatest).toEqual([]);
    expect(result.skippedInTtl).toEqual([]);
  });

  it("clamps keepLatestRuns: 0 up to one so validate.log's run_log: cannot dangle", async () => {
    const root = await newTempDir("keep-zero");
    const newest = await seedRunLog(root, "run-20260402120000002", 90);
    const older = await seedRunLog(root, "run-20260401120000001", 91);

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 0 });

    expect(result.keepLatest).toBe(1);
    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(await exists(newest)).toBe(true);
    expect(await exists(older)).toBe(false);
  });

  it("retains the run validate.log points at even when it falls past keep-latest", async () => {
    const root = await newTempDir("pointer");
    const pointed = await seedRunLog(root, "run-20260401120000001", 90);
    const newest = await seedRunLog(root, "run-20260402120000002", 89);
    await writeFile(
      path.join(root, ".qfai", "report", "validate.log"),
      "- run_id: run-20260401120000001\n- run_log: .qfai/report/run-20260401120000001\n",
      "utf-8",
    );

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.removed).toEqual([]);
    expect(result.retainedPointer.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(await exists(pointed)).toBe(true);
    expect(await exists(newest)).toBe(true);
  });

  it("retains the pointed-at run when outDir — and so the run_log: path — holds a space", async () => {
    // `writeValidateRunLog` writes `relativeReportDir` verbatim, so an
    // outDir with a space produces `- run_log: my reports/run-...`. A
    // `\S+` capture stopped at the space, read the pointer as absent and
    // deleted the run the Hard Gate evidence names.
    const root = await newTempDir("spaced-outdir");
    const config = { ...defaultConfig, paths: { ...defaultConfig.paths, outDir: "my reports" } };
    const reportRoot = path.join(root, "my reports");
    const pointed = path.join(reportRoot, "run-20260401120000001");
    const newest = path.join(reportRoot, "run-20260402120000002");
    for (const dir of [pointed, newest]) {
      await mkdir(dir, { recursive: true });
      const mtime = new Date(Date.now() - 90 * DAY_MS);
      await utimes(dir, mtime, mtime);
    }
    await writeFile(
      path.join(reportRoot, "validate.log"),
      "- run_log: my reports/run-20260401120000001\n",
      "utf-8",
    );

    const result = await cleanStaleRunLogs(root, config, { keepLatest: 1 });

    expect(result.removed).toEqual([]);
    expect(result.retainedPointer.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(await exists(pointed)).toBe(true);
  });

  it("retains a run named only by run_id: when the run_log: path is unusable", async () => {
    const root = await newTempDir("run-id-only");
    const pointed = await seedRunLog(root, "run-20260401120000001", 90);
    await seedRunLog(root, "run-20260402120000002", 89);
    await writeFile(
      path.join(root, ".qfai", "report", "validate.log"),
      "- run_id: run-20260401120000001\n- run_log: (rewritten by hand)\n",
      "utf-8",
    );

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.removed).toEqual([]);
    expect(result.retainedPointer.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(await exists(pointed)).toBe(true);
  });

  it("keeps the run that really started last when a clock rollback inverts the run ids", async () => {
    // Run ids come from the LOCAL clock, so a DST fall-back gives the
    // later run the smaller id. `run.json#started_at` is a UTC instant
    // and keeps the ordering honest.
    const root = await newTempDir("clock-rollback");
    const beforeRollback = await seedRunLog(
      root,
      "run-20261101015900000",
      90,
      "2026-11-01T05:59:00.000Z",
    );
    const afterRollback = await seedRunLog(
      root,
      "run-20261101010500000",
      90,
      "2026-11-01T06:05:00.000Z",
    );

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.retainedLatest.map((entry) => entry.runId)).toEqual(["run-20261101010500000"]);
    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20261101015900000"]);
    expect(await exists(afterRollback)).toBe(true);
    expect(await exists(beforeRollback)).toBe(false);
  });

  it("reports an unreadable outDir instead of returning an empty plan", async () => {
    const root = await newTempDir("unreadable");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    // outDir occupied by a file: readdir fails with ENOTDIR, which is
    // not the ENOENT "never validated" case.
    await writeFile(path.join(root, ".qfai", "report"), "not a directory\n", "utf-8");

    await expect(cleanStaleRunLogs(root, defaultConfig, {})).rejects.toThrow(
      /failed to read run log directory/u,
    );
  });
});
