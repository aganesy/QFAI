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

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { writeValidateRunLog } from "../../src/core/runLog.js";
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

describe("validate.log freshness under concurrent runs", () => {
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
