/**
 * Spawn-based tests for `scripts/check-scanner-coverage.mjs`.
 *
 * The guard's contract:
 *   - designMdViolations.ts statement coverage >= 90  -> exit 0
 *   - designMdViolations.ts statement coverage <  90  -> exit 1
 *   - designMdViolations.ts entry missing             -> exit 1
 *   - coverage-summary.json missing                   -> exit 1
 *   - unknown flag                                    -> exit 2
 *
 * The script reads a `coverage-summary.json` (produced by
 * `vitest run --coverage`) and asserts statement coverage on the
 * scanner module is at least 90%. Tests inject synthetic
 * coverage-summary fixtures via the `--summary <path>` flag so the
 * pass/fail/missing cases are deterministic in CI.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-scanner-coverage.mjs");

const SCANNER_KEY_WIN =
  "C:\\Users\\YusukeSenaga\\Documents\\GitHub\\QFAI\\packages\\qfai\\src\\core\\prototyping\\designMdViolations.ts";
// Posix form for the same file — coverage-v8 uses absolute paths so
// the fixture must match how the script's matcher locates the entry.
// The matcher MUST recognize the file by its tail path
// (`packages/qfai/src/core/prototyping/designMdViolations.ts`) regardless
// of OS / drive-letter prefix so the same fixture works on
// ubuntu-latest CI and Windows dev machines.
const SCANNER_KEY_POSIX =
  "/home/runner/work/QFAI/QFAI/packages/qfai/src/core/prototyping/designMdViolations.ts";

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(args: string[]): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { encoding: "utf-8" });
  return {
    status: child.status,
    stdout: child.stdout ?? "",
    stderr: child.stderr ?? "",
  };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-scanner-cov-"));
  tempDirs.push(dir);
  return dir;
}

async function writeSummary(dir: string, entry: Record<string, unknown>): Promise<string> {
  const file = path.join(dir, "coverage-summary.json");
  await writeFile(file, JSON.stringify(entry, null, 2), "utf-8");
  return file;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await removeTempTree(dir);
    }
  }
});

describe("check-scanner-coverage.mjs", () => {
  it("exit 0 when designMdViolations.ts statement coverage is >= 90", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      total: {
        statements: { total: 1000, covered: 950, skipped: 0, pct: 95 },
      },
      [SCANNER_KEY_POSIX]: {
        statements: { total: 100, covered: 95, skipped: 0, pct: 95 },
        branches: { total: 50, covered: 45, skipped: 0, pct: 90 },
        functions: { total: 20, covered: 19, skipped: 0, pct: 95 },
        lines: { total: 100, covered: 95, skipped: 0, pct: 95 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/designMdViolations\.ts/);
    expect(r.stdout).toMatch(/95/);
  });

  it("exit 0 at exactly the 90% threshold", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      [SCANNER_KEY_POSIX]: {
        statements: { total: 100, covered: 90, skipped: 0, pct: 90 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(0);
  });

  it("exit 1 when designMdViolations.ts statement coverage is < 90", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      [SCANNER_KEY_POSIX]: {
        statements: { total: 100, covered: 85, skipped: 0, pct: 85 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/85/);
    expect(r.stderr).toMatch(/90/);
    expect(r.stderr).toMatch(/designMdViolations\.ts/);
  });

  it("exit 1 when designMdViolations.ts entry is missing from the summary", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      total: {
        statements: { total: 1000, covered: 950, skipped: 0, pct: 95 },
      },
      "/some/other/file.ts": {
        statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/designMdViolations\.ts/);
    expect(r.stderr).toMatch(/not found/i);
  });

  it("exit 1 when coverage-summary.json is missing on disk", async () => {
    const r = runGuard(["--summary", "/nonexistent/coverage-summary.json"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/coverage-summary/);
  });

  it("exit 2 when invoked with an unknown flag", () => {
    const r = runGuard(["--bogus-flag"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown/i);
  });

  it("matches the Windows-style absolute path form of the scanner entry", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      [SCANNER_KEY_WIN]: {
        statements: { total: 100, covered: 95, skipped: 0, pct: 95 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(0);
  });

  it("exit 1 when coverage-summary.json is malformed JSON", async () => {
    const dir = await newTempDir();
    const file = path.join(dir, "coverage-summary.json");
    await writeFile(file, "{ not valid JSON", "utf-8");
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/parse|JSON/i);
  });

  it("exit 1 when scanner entry lacks a numeric statements.pct", async () => {
    const dir = await newTempDir();
    const file = await writeSummary(dir, {
      [SCANNER_KEY_POSIX]: {
        statements: { total: 100, covered: 95, skipped: 0 },
      },
    });
    const r = runGuard(["--summary", file]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/not a number|pct/i);
  });

  it("exit 2 when --threshold is a non-numeric value (fail-fast against CLI typo)", () => {
    const r = runGuard(["--threshold", "foo"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/threshold/i);
  });

  it("exit 2 when --summary is invoked with an empty value", () => {
    const r = runGuard(["--summary", ""]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/summary/i);
  });
});
