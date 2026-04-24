import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

describe("report", { timeout: 15000 }, () => {
  it("runs init -> validate(json) -> report(md)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportPath = path.join(root, ".qfai", "report", "report.md");

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
    expect(content).toContain("## SC Coverage");
    expect(content).toContain("## SC → Referenced Tests");
    expect(content).toContain("## Duplicate SC IDs");
    expect(content).toContain("## Decision Guardrails");
  });

  it("guides when validate.json is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportPath = path.join(root, ".qfai", "report", "report.md");

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

    const reportPath = path.join(root, ".qfai", "report", "report.md");
    const validatePath = path.join(root, ".qfai", "report", "validate.json");

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

  it("runs report with --run-validate --profile sdd", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const previousCi = process.env.CI;
    const previousGithubActions = process.env.GITHUB_ACTIONS;
    process.env.CI = "false";
    delete process.env.GITHUB_ACTIONS;

    try {
      const reportPath = path.join(root, ".qfai", "report", "report.md");
      const validatePath = path.join(root, ".qfai", "report", "validate.json");

      await runReport({
        root,
        format: "md",
        outPath: reportPath,
        runValidate: true,
        profile: "sdd",
      });

      const report = await readFile(reportPath, "utf-8");
      const validationRaw = await readFile(validatePath, "utf-8");
      const validation = JSON.parse(validationRaw) as {
        profile?: string;
        issues?: Array<{ code?: string }>;
      };
      const issueCodes = (validation.issues ?? []).map((item) => item.code);

      expect(report).toContain("# QFAI Report");
      expect(validation.profile).toBe("sdd");
      expect(issueCodes).not.toContain("QFAI-ATDD-111");
      expect(issueCodes).not.toContain("QFAI-PROT-150");
    } finally {
      if (previousCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previousCi;
      }
      if (previousGithubActions === undefined) {
        delete process.env.GITHUB_ACTIONS;
      } else {
        process.env.GITHUB_ACTIONS = previousGithubActions;
      }
    }
  });

  it("fails run-validate with partial profile in CI", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const previousCi = process.env.CI;
    const previousGithubActions = process.env.GITHUB_ACTIONS;
    const previousExitCode = process.exitCode;
    process.env.CI = "true";
    delete process.env.GITHUB_ACTIONS;
    process.exitCode = undefined;

    try {
      const reportPath = path.join(root, ".qfai", "report", "report.md");
      const validatePath = path.join(root, ".qfai", "report", "validate.json");
      await runReport({
        root,
        format: "md",
        outPath: reportPath,
        runValidate: true,
        profile: "sdd",
      });

      const validationRaw = await readFile(validatePath, "utf-8");
      const validation = JSON.parse(validationRaw) as {
        issues?: Array<{ code?: string }>;
      };
      expect(process.exitCode).toBe(1);
      expect((validation.issues ?? []).some((item) => item.code === "QFAI-VALIDATE-017")).toBe(
        true,
      );
    } finally {
      process.exitCode = previousExitCode;
      if (previousCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previousCi;
      }
      if (previousGithubActions === undefined) {
        delete process.env.GITHUB_ACTIONS;
      } else {
        process.env.GITHUB_ACTIONS = previousGithubActions;
      }
    }
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

    const defaultPath = path.join(root, ".qfai", "report", "validate.json");
    const customDir = path.join(root, "custom");
    const customPath = path.join(customDir, "validate.json");
    await mkdir(customDir, { recursive: true });
    await writeFile(customPath, await readFile(defaultPath, "utf-8"));
    await rm(defaultPath, { force: true });

    const reportPath = path.join(root, ".qfai", "report", "report.md");
    await runReport({
      root,
      format: "md",
      outPath: reportPath,
      inputPath: path.relative(root, customPath),
    });

    const report = await readFile(reportPath, "utf-8");
    expect(report).toContain("# QFAI Report");
  });

  it("links file paths with --base-url", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    const reportPath = path.join(root, ".qfai", "report", "report.md");
    await runReport({
      root,
      format: "md",
      outPath: reportPath,
      baseUrl: "https://example.com/repo/",
    });

    const report = await readFile(reportPath, "utf-8");
    expect(report).toContain("- ルート: [.](https://example.com/repo)");
    expect(report).toContain(
      "- 設定: [qfai.config.yaml](https://example.com/repo/qfai.config.yaml)",
    );
  });
});
