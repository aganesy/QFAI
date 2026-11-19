/**
 * `qfai db-drift --fail-on never`, through the CLI entry point.
 *
 * The exit-code help says the threshold makes a difference exit 0, and the
 * command handler honours it, but the argument parser refused the flag with
 * exit 2. These cases run `run()` with a real argv so the parser, the dispatch
 * and the handler are held together; the handler's own suite injects its
 * options directly and cannot see a refusal in front of it.
 *
 * Here rather than beside the handler cases: the comparison starts a database
 * per side, which is seconds.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";

const tempDirs: string[] = [];

async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/** A project whose migrations add a column the contracts never declare. */
async function driftingProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-drift-fail-on-"));
  tempDirs.push(root);
  await write(
    root,
    "qfai.config.yaml",
    ["paths:", "  contractsDir: .qfai/contracts", "  migrationsDir: migrations", ""].join("\n"),
  );
  await write(
    root,
    ".qfai/contracts/db/DB-0001.sql",
    "-- QFAI-CONTRACT-ID: DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY);\n",
  );
  await write(
    root,
    "migrations/0001_orders.sql",
    "CREATE TABLE orders (id TEXT PRIMARY KEY, cancelled_at TIMESTAMP);\n",
  );
  return root;
}

async function captureRun(
  argv: string[],
): Promise<{ stdout: string; stderr: string; exitCode: typeof process.exitCode }> {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(argv, process.cwd());
    return {
      stdout: stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
      stderr: stderrSpy.mock.calls.map((call) => String(call[0])).join(""),
      exitCode: process.exitCode,
    };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = previousExitCode;
  }
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("qfai db-drift --fail-on, from the command line", () => {
  it("reports the difference and exits 0 under --fail-on never", async () => {
    const root = await driftingProject();
    const { stdout, stderr, exitCode } = await captureRun([
      "db-drift",
      "--root",
      root,
      "--fail-on",
      "never",
    ]);
    expect(stderr).not.toContain("--fail-on");
    expect(stdout).toContain("cancelled_at");
    expect(exitCode).toBe(0);
  });

  it("exits 1 on the same difference under --fail-on error, the default", async () => {
    const root = await driftingProject();
    const { stdout, exitCode } = await captureRun([
      "db-drift",
      "--root",
      root,
      "--fail-on",
      "error",
    ]);
    expect(stdout).toContain("cancelled_at");
    expect(exitCode).toBe(1);
  });

  it("still exits 2 under --fail-on never when a file would not apply", async () => {
    // `never` waives a difference, not a comparison that never happened: a
    // migration that does not apply leaves its columns out of one side.
    const root = await driftingProject();
    await write(root, "migrations/0002_broken.sql", "CREATE TABLE refunds (id TEXT PRIMARY KEY\n");
    const { stdout, exitCode } = await captureRun([
      "db-drift",
      "--root",
      root,
      "--fail-on",
      "never",
    ]);
    expect(stdout).toContain("0002_broken.sql");
    expect(exitCode).toBe(2);
  });

  it("refuses --fail-on warning, since the command has no warning tier", async () => {
    const root = await driftingProject();
    const { stderr, exitCode } = await captureRun([
      "db-drift",
      "--root",
      root,
      "--fail-on",
      "warning",
    ]);
    expect(stderr).toContain("--fail-on");
    expect(exitCode).toBe(2);
  });
});
