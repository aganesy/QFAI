/**
 * A run directory that `stat` cannot read must not vanish from the prune.
 *
 * `listRunLogDirs` used to swallow every `stat` error, so an `EACCES` or
 * an I/O error dropped the run silently and `doctor --clean` reported a
 * successful pass whose candidate ages were never all examined. Only a
 * run removed between `readdir` and `stat` (`ENOENT`) may be skipped.
 *
 * Lives apart from `cleanRunLogs.test.ts` because `vi.mock` is hoisted
 * to module scope and would otherwise apply to every case in that file.
 */

import { access, mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { PathLike, StatOptions } from "node:fs";
import type * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

/** Basenames whose `stat` the mocked module rejects, with the errno code to use. */
const { failingStats } = vi.hoisted(() => ({ failingStats: new Map<string, string>() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    stat: async (target: PathLike, options?: StatOptions) => {
      const code = typeof target === "string" ? failingStats.get(path.basename(target)) : undefined;
      if (code !== undefined) {
        const error: NodeJS.ErrnoException = new Error(
          `${code}: stat failed, stat '${String(target)}'`,
        );
        error.code = code;
        throw error;
      }
      return actual.stat(target, options);
    },
  };
});

const { defaultConfig } = await import("../../../../src/core/config.js");
const { cleanStaleRunLogs } = await import("../../../../src/core/doctor/cleanRunLogs.js");

const DAY_MS = 24 * 60 * 60 * 1000;
const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-clean-runlogs-stat-"));
  tempDirs.push(root);
  return root;
}

async function seedRunLog(root: string, runId: string): Promise<string> {
  const dir = path.join(root, ".qfai", "report", runId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "run.json"), "{}\n", "utf-8");
  const mtime = new Date(Date.now() - 90 * DAY_MS);
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

afterEach(async () => {
  failingStats.clear();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("cleanStaleRunLogs — a run directory whose stat fails", () => {
  it("names the run and removes nothing when stat fails with EACCES", async () => {
    const root = await newRoot();
    const older = await seedRunLog(root, "run-20260401120000001");
    await seedRunLog(root, "run-20260402120000002");
    await seedRunLog(root, "run-20260403120000003");
    failingStats.set("run-20260402120000002", "EACCES");

    await expect(cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 })).rejects.toThrow(
      /failed to stat run log run-20260402120000002 .*EACCES/u,
    );
    expect(await exists(older)).toBe(true);
  });

  it("skips a run that vanished before its stat and prunes the rest", async () => {
    const root = await newRoot();
    await seedRunLog(root, "run-20260401120000001");
    await seedRunLog(root, "run-20260403120000003");
    failingStats.set("run-20260402120000002", "ENOENT");
    await mkdir(path.join(root, ".qfai", "report", "run-20260402120000002"));

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.retainedLatest.map((entry) => entry.runId)).toEqual(["run-20260403120000003"]);
    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(result.failed).toEqual([]);
  });
});
