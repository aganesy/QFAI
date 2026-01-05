import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { createSyncData, computeExitCode } from "../../src/core/sync.js";

describe("sync core", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-sync-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reports added when project has no promptpack", async () => {
    await mkdir(path.join(tmpDir, ".qfai"), { recursive: true });

    const data = await createSyncData({
      root: tmpDir,
      mode: "check",
    });

    expect(data.tool).toBe("qfai");
    expect(data.mode).toBe("check");
    expect(data.scope).toBe("promptpack");
    // All files from assets should be marked as "added"
    expect(data.summary.added).toBeGreaterThan(0);
    expect(data.summary.removed).toBe(0);
  });

  it("reports unchanged when project matches assets", async () => {
    // This test uses actual assets from the package
    // In a real scenario, we'd copy them to tmpDir first
    const assetsPath = path.resolve(
      __dirname,
      "../../assets/init/.qfai/promptpack",
    );
    const projectPath = path.join(tmpDir, ".qfai", "promptpack");

    // Copy assets to project manually for this test
    const { cp } = await import("node:fs/promises");
    await mkdir(path.dirname(projectPath), { recursive: true });
    await cp(assetsPath, projectPath, { recursive: true });

    const data = await createSyncData({
      root: tmpDir,
      mode: "check",
    });

    expect(data.summary.unchanged).toBeGreaterThan(0);
    expect(data.summary.added).toBe(0);
    expect(data.summary.changed).toBe(0);
    expect(data.summary.removed).toBe(0);
  });

  it("reports changed when file content differs", async () => {
    const assetsPath = path.resolve(
      __dirname,
      "../../assets/init/.qfai/promptpack",
    );
    const projectPath = path.join(tmpDir, ".qfai", "promptpack");

    const { cp } = await import("node:fs/promises");
    await mkdir(path.dirname(projectPath), { recursive: true });
    await cp(assetsPath, projectPath, { recursive: true });

    // Modify a file to create a diff
    const constitutionPath = path.join(projectPath, "constitution.md");
    await writeFile(constitutionPath, "# Modified content\n", "utf-8");

    const data = await createSyncData({
      root: tmpDir,
      mode: "check",
    });

    expect(data.summary.changed).toBeGreaterThan(0);
  });

  it("reports removed when project has extra files", async () => {
    const assetsPath = path.resolve(
      __dirname,
      "../../assets/init/.qfai/promptpack",
    );
    const projectPath = path.join(tmpDir, ".qfai", "promptpack");

    const { cp } = await import("node:fs/promises");
    await mkdir(path.dirname(projectPath), { recursive: true });
    await cp(assetsPath, projectPath, { recursive: true });

    // Add an extra file that doesn't exist in assets
    await writeFile(
      path.join(projectPath, "local-custom.md"),
      "# Local customization\n",
      "utf-8",
    );

    const data = await createSyncData({
      root: tmpDir,
      mode: "check",
    });

    expect(data.summary.removed).toBeGreaterThan(0);
  });

  it("exports to timestamped directory", async () => {
    await mkdir(path.join(tmpDir, ".qfai"), { recursive: true });

    const data = await createSyncData({
      root: tmpDir,
      mode: "export",
    });

    expect(data.exportPath).toBeDefined();
    expect(data.exportPath).toContain(".sync");
    expect(data.exportPath).toContain("promptpack");
  });

  it("retries when export path already exists", async () => {
    await mkdir(path.join(tmpDir, ".qfai"), { recursive: true });

    vi.useFakeTimers();
    // Use a fixed date/time to make the export path deterministic.
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));

    try {
      // Create a static output path and pre-create the exact export directory
      const staticOutPath = path.join(
        tmpDir,
        ".qfai",
        ".sync",
        "collision-test",
      );

      // Pre-create the exact directory that would be created (promptpack subdirectory)
      // The export creates: outBase/<timestamp>-<milliseconds>/promptpack
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const uniqueTimestamp = `${timestamp}-${Date.now()}`;
      const exportDir = path.join(staticOutPath, uniqueTimestamp, "promptpack");
      await mkdir(exportDir, { recursive: true });

      const data = await createSyncData({
        root: tmpDir,
        mode: "export",
        outPath: staticOutPath,
      });

      expect(data.exportPath).toBeDefined();
      expect(data.exportPath).toContain(`${uniqueTimestamp}-1`);
    } finally {
      vi.useRealTimers();
    }
  });

  describe("computeExitCode", () => {
    it("returns 0 when no diff", () => {
      const data = {
        tool: "qfai" as const,
        version: "0.7.0",
        generatedAt: new Date().toISOString(),
        root: ".",
        mode: "check" as const,
        scope: "promptpack",
        summary: { added: 0, removed: 0, changed: 0, unchanged: 5 },
        diffs: [],
      };
      expect(computeExitCode(data)).toBe(0);
    });

    it("returns 1 when has added", () => {
      const data = {
        tool: "qfai" as const,
        version: "0.7.0",
        generatedAt: new Date().toISOString(),
        root: ".",
        mode: "check" as const,
        scope: "promptpack",
        summary: { added: 1, removed: 0, changed: 0, unchanged: 5 },
        diffs: [],
      };
      expect(computeExitCode(data)).toBe(1);
    });

    it("returns 1 when has changed", () => {
      const data = {
        tool: "qfai" as const,
        version: "0.7.0",
        generatedAt: new Date().toISOString(),
        root: ".",
        mode: "check" as const,
        scope: "promptpack",
        summary: { added: 0, removed: 0, changed: 1, unchanged: 5 },
        diffs: [],
      };
      expect(computeExitCode(data)).toBe(1);
    });

    it("returns 1 when has removed", () => {
      const data = {
        tool: "qfai" as const,
        version: "0.7.0",
        generatedAt: new Date().toISOString(),
        root: ".",
        mode: "check" as const,
        scope: "promptpack",
        summary: { added: 0, removed: 1, changed: 0, unchanged: 5 },
        diffs: [],
      };
      expect(computeExitCode(data)).toBe(1);
    });
  });
});
