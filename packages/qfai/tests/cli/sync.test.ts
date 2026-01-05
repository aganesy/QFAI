import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runSync } from "../../src/cli/commands/sync.js";

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
