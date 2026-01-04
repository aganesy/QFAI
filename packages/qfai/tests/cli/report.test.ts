import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

describe("report", () => {
  it("runs init -> validate(json) -> report(md)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportPath = path.join(root, ".qfai", "out", "report.md");

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    await runReport({
      root,
      format: "md",
      outPath: reportPath,
    });

    const content = await readFile(reportPath, "utf-8");
    expect(content).toContain("# QFAI Report");
    expect(content).toContain("## Hotspots");
    expect(content).toContain("## SCカバレッジ");
    expect(content).toContain("## SC→参照テスト");
    expect(content).toContain("## Spec:SC=1:1 違反");
  });

  it("includes reportFormatVersion in json output", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    const reportPath = path.join(root, ".qfai", "out", "report.json");
    await runReport({
      root,
      format: "json",
      outPath: reportPath,
    });

    const content = await readFile(reportPath, "utf-8");
    const parsed = JSON.parse(content) as { reportFormatVersion?: number };
    expect(parsed.reportFormatVersion).toBe(1);
  });

  it("guides when validate.json is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportPath = path.join(root, ".qfai", "out", "report.md");

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({ root, format: "md" });

      expect(process.exitCode).toBe(2);
      await expect(readFile(reportPath, "utf-8")).rejects.toThrow();
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("runs report with --run-validate", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportPath = path.join(root, ".qfai", "out", "report.md");
    const validatePath = path.join(root, ".qfai", "out", "validate.json");

    await runReport({
      root,
      format: "md",
      outPath: reportPath,
      runValidate: true,
    });

    const report = await readFile(reportPath, "utf-8");
    const validation = await readFile(validatePath, "utf-8");
    expect(report).toContain("# QFAI Report");
    expect(validation).toContain('"toolVersion"');
  });

  it("reads validate.json from --in", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    const defaultPath = path.join(root, ".qfai", "out", "validate.json");
    const customDir = path.join(root, "custom");
    const customPath = path.join(customDir, "validate.json");
    await mkdir(customDir, { recursive: true });
    await writeFile(customPath, await readFile(defaultPath, "utf-8"));
    await rm(defaultPath, { force: true });

    const reportPath = path.join(root, ".qfai", "out", "report.md");
    await runReport({
      root,
      format: "md",
      outPath: reportPath,
      inputPath: path.relative(root, customPath),
    });

    const report = await readFile(reportPath, "utf-8");
    expect(report).toContain("# QFAI Report");
  });
});
