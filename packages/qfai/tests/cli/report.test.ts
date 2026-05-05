import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

const VALID_PROSE_CRITIQUE = Array.from(
  { length: 200 },
  (_, index) => `critique-word-${index}`,
).join(" ");

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
      // `discussion` is a representative narrow profile rejected in CI.
      // (`sdd` joined the CI allow-list with PR #206 review LW-G; see
      // packages/qfai/src/core/phasePolicy.ts for the rationale.)
      await runReport({
        root,
        format: "md",
        outPath: reportPath,
        runValidate: true,
        profile: "discussion",
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

  it("includes v2.0 prototyping summary from prototyping.json", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const evidenceDir = path.join(root, ".qfai", "evidence", "prototyping");
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(
      path.join(evidenceDir, "prototyping.json"),
      `${JSON.stringify(
        {
          specsCovered: ["SPEC-0001"],
          iterations: [
            {
              index: 0,
              commitSha: "a".repeat(40),
              scores: {
                informationArchitecture: "acceptable",
                navigationFlow: "acceptable",
                usability: "acceptable",
                functionality: "acceptable",
              },
              proseCritique: VALID_PROSE_CRITIQUE,
              layoutAntiPatternsDetected: [],
              designMdViolations: [],
              pivotDirective: "continue",
              evidenceRefs: {
                screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
                html: ".qfai/evidence/prototyping/iter-00/home.html",
              },
            },
          ],
          acceptedIterationIndex: 0,
          stopReason: null,
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

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
    });

    const report = await readFile(reportPath, "utf-8");
    expect(report).toContain("### prototyping.lifecycle");
    expect(report).toContain("- iterations: 1");
    expect(report).toContain("- effective: single-thread-loop");
    expect(report).toContain("- obligation profile: single-thread-loop");
  });

  it("scopes prototyping spec coverage to the primary prototyping spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const primarySpecDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(primarySpecDir, { recursive: true });
    await writeFile(
      path.join(primarySpecDir, "01_Spec.md"),
      "# Primary UI spec\n\nsurface_type: ui-bearing\n",
      "utf-8",
    );
    const extraSpecDir = path.join(root, ".qfai", "specs", "spec-0002");
    await mkdir(extraSpecDir, { recursive: true });
    await writeFile(path.join(extraSpecDir, "01_Spec.md"), "# Secondary API spec\n", "utf-8");

    const evidenceDir = path.join(root, ".qfai", "evidence", "prototyping");
    const iterDir = path.join(evidenceDir, "iter-00");
    await mkdir(evidenceDir, { recursive: true });
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "home.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "home.html"), "<html></html>", "utf-8");
    await writeFile(
      path.join(evidenceDir, "prototyping.json"),
      `${JSON.stringify(
        {
          specsCovered: ["SPEC-0001"],
          iterations: [
            {
              index: 0,
              commitSha: "a".repeat(40),
              scores: {
                informationArchitecture: "acceptable",
                navigationFlow: "acceptable",
                usability: "acceptable",
                functionality: "acceptable",
              },
              proseCritique: VALID_PROSE_CRITIQUE,
              layoutAntiPatternsDetected: [],
              designMdViolations: [],
              pivotDirective: "continue",
              evidenceRefs: {
                screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
                html: ".qfai/evidence/prototyping/iter-00/home.html",
              },
            },
          ],
          acceptedIterationIndex: 0,
          stopReason: null,
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
    });

    const reportPath = path.join(root, ".qfai", "report", "report.json");
    await runReport({
      root,
      format: "json",
      outPath: reportPath,
    });

    const report = JSON.parse(await readFile(reportPath, "utf-8")) as {
      prototyping?: {
        evidence?: {
          specsCoverage?: {
            expectedSpecIds: string[];
            missingSpecIds: string[];
          };
          specsCoverageStatus?: string;
        };
      };
    };
    expect(report.prototyping?.evidence?.specsCoverage?.expectedSpecIds).toEqual(["0001"]);
    expect(report.prototyping?.evidence?.specsCoverage?.missingSpecIds).toEqual([]);
    expect(report.prototyping?.evidence?.specsCoverageStatus).toBe("complete");
  });
});
