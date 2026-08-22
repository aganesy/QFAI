/**
 * A partial run-log prune must still say what it deleted.
 *
 * `removeRunLog` used to throw, so a second candidate failing with
 * `EACCES` / `EBUSY` aborted `cleanStaleRunLogs` before it returned —
 * and with it the record of the first candidate, which was already
 * irreversibly gone. The operator saw one errno and no list.
 *
 * Lives apart from `cleanRunLogs.test.ts` because `vi.mock` is hoisted
 * to module scope and would otherwise apply to every case in that file.
 */

import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { PathLike, RmOptions } from "node:fs";
import type * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

/** Basenames whose removal the mocked `rm` rejects. */
const { unremovableRunIds } = vi.hoisted(() => ({ unremovableRunIds: new Set<string>() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    rm: async (target: PathLike, options?: RmOptions): Promise<void> => {
      if (typeof target === "string" && unremovableRunIds.has(path.basename(target))) {
        const error: NodeJS.ErrnoException = new Error(
          `EACCES: permission denied, rmdir '${target}'`,
        );
        error.code = "EACCES";
        throw error;
      }
      await actual.rm(target, options);
    },
  };
});

const { defaultConfig } = await import("../../../../src/core/config.js");
const { cleanStaleRunLogs } = await import("../../../../src/core/doctor/cleanRunLogs.js");

const DAY_MS = 24 * 60 * 60 * 1000;
const tempDirs: string[] = [];

async function seedRunLog(root: string, runId: string): Promise<string> {
  const dir = path.join(root, ".qfai", "report", runId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "run.json"), "{}\n", "utf-8");
  const mtime = new Date(Date.now() - 90 * DAY_MS);
  await utimes(dir, mtime, mtime);
  return dir;
}

afterEach(async () => {
  unremovableRunIds.clear();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("cleanStaleRunLogs — a failed removal does not discard the successful ones", () => {
  it("returns both the removed and the failed candidates instead of throwing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-clean-runlogs-partial-"));
    tempDirs.push(root);
    await seedRunLog(root, "run-20260401120000001");
    await seedRunLog(root, "run-20260402120000002");
    await seedRunLog(root, "run-20260403120000003");
    // Newest is kept by keepLatest; of the two candidates the OLDER one
    // is removed last, so the failure lands after a successful removal.
    unremovableRunIds.add("run-20260401120000001");

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260402120000002"]);
    expect(result.failed.map((failure) => failure.entry.runId)).toEqual(["run-20260401120000001"]);
    expect(result.failed[0]?.reason).toMatch(/EACCES/u);
  });

  it("reports no failures on the happy path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-clean-runlogs-partial-ok-"));
    tempDirs.push(root);
    await seedRunLog(root, "run-20260401120000001");
    await seedRunLog(root, "run-20260402120000002");

    const result = await cleanStaleRunLogs(root, defaultConfig, { keepLatest: 1 });

    expect(result.removed.map((entry) => entry.runId)).toEqual(["run-20260401120000001"]);
    expect(result.failed).toEqual([]);
  });
});
