import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runSync } from "../../src/cli/commands/sync.js";
import { parseArgs } from "../../src/cli/lib/args.js";

describe("sync command", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-sync-cli-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns 0 when project is in sync after init", async () => {
    // Initialize project
    await runInit({ dir: tmpDir, force: false, dryRun: false, yes: true });

    const exitCode = await runSync({
      root: tmpDir,
      mode: "check",
      format: "text",
    });

    expect(exitCode).toBe(0);
  });

  it("returns 1 when project has no promptpack", async () => {
    await mkdir(path.join(tmpDir, ".qfai"), { recursive: true });

    const exitCode = await runSync({
      root: tmpDir,
      mode: "check",
      format: "text",
    });

    expect(exitCode).toBe(1);
  });

  it("exports to custom path", async () => {
    await runInit({ dir: tmpDir, force: false, dryRun: false, yes: true });

    const customOut = path.join(tmpDir, "custom-sync-out");
    const exitCode = await runSync({
      root: tmpDir,
      mode: "export",
      format: "text",
      outPath: customOut,
    });

    expect(exitCode).toBe(0);
  });

  it("outputs json format", async () => {
    await runInit({ dir: tmpDir, force: false, dryRun: false, yes: true });

    const exitCode = await runSync({
      root: tmpDir,
      mode: "check",
      format: "json",
    });

    expect(exitCode).toBe(0);
  });
});

describe("sync --mode validation", () => {
  it("throws error when --mode is used without value", () => {
    expect(() => parseArgs(["sync", "--mode"], "/tmp")).toThrow(
      '--mode option requires a value of "check" or "export"',
    );
  });

  it("throws error when --mode is used with invalid value", () => {
    expect(() => parseArgs(["sync", "--mode", "invalid"], "/tmp")).toThrow(
      'Invalid value for --mode: "invalid". Expected "check" or "export".',
    );
  });

  it("throws error when --mode is used with non-sync command", () => {
    expect(() => parseArgs(["validate", "--mode", "check"], "/tmp")).toThrow(
      '--mode option is only supported for the "sync" command',
    );
  });

  it("accepts valid --mode check", () => {
    const result = parseArgs(["sync", "--mode", "check"], "/tmp");
    expect(result.options.syncMode).toBe("check");
  });

  it("accepts valid --mode export", () => {
    const result = parseArgs(["sync", "--mode", "export"], "/tmp");
    expect(result.options.syncMode).toBe("export");
  });
});
