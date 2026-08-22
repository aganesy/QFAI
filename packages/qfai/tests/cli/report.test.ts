import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import type {
  ValidationCounts,
  ValidationProfile,
  ValidationResult,
} from "../../src/core/types.js";

const VALID_PROSE_CRITIQUE = Array.from(
  { length: 200 },
  (_, index) => `critique-word-${index}`,
).join(" ");

/**
 * profile ごとの counts だけが違う、最小限の validate 出力を書き出す。
 * report の読み取り側がどのファイルを選んだかを counts で識別できるようにする。
 */
async function writeValidationFixture(
  filePath: string,
  profile: ValidationProfile,
  counts: ValidationCounts,
): Promise<void> {
  const result: ValidationResult = {
    toolVersion: "0.0.0-test",
    profile,
    issues: [],
    counts,
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
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
}

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

  it("reports a narrow profile in CI without failing the run (#397)", async () => {
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
      // The finding is appended to a real run. Exiting non-zero here made
      // every stage gate that names a narrow profile unreachable in CI, and
      // `qfai-discussion` names exactly this one as its only gate.
      expect(process.exitCode).not.toBe(1);
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

  it("reads validate-<profile>.json when --profile is given without --run-validate (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportDir = path.join(root, ".qfai", "report");
    // 常に最新のポインタは prototyping の実行結果を保持している状態。
    await writeValidationFixture(path.join(reportDir, "validate.json"), "prototyping", {
      info: 1,
      warning: 3,
      error: 0,
    });
    await writeValidationFixture(path.join(reportDir, "validate-sdd.json"), "sdd", {
      info: 5,
      warning: 1,
      error: 0,
    });

    const reportPath = path.join(reportDir, "report.json");
    await runReport({
      root,
      format: "json",
      outPath: reportPath,
      profile: "sdd",
    });

    const report = JSON.parse(await readFile(reportPath, "utf-8")) as {
      profile?: string;
      summary?: { counts?: ValidationCounts };
    };
    expect(report.summary?.counts).toEqual({ info: 5, warning: 1, error: 0 });
    expect(report.profile).toBe("sdd");
  });

  it("guides toward the profile run when validate-<profile>.json is missing (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportDir = path.join(root, ".qfai", "report");
    await writeValidationFixture(path.join(reportDir, "validate.json"), "prototyping", {
      info: 1,
      warning: 3,
      error: 0,
    });

    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({ root, format: "json", profile: "sdd" });

      expect(process.exitCode).toBe(2);
      const written = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
      expect(written).toContain("validate-sdd.json");
      expect(written).toContain("qfai validate --profile sdd");
    } finally {
      process.exitCode = previousExitCode;
      stderr.mockRestore();
    }
  });

  it("warns about a narrow profile in CI without --run-validate (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportDir = path.join(root, ".qfai", "report");
    await writeValidationFixture(path.join(reportDir, "validate-discussion.json"), "discussion", {
      info: 0,
      warning: 0,
      error: 0,
    });

    const previousCi = process.env.CI;
    const previousGithubActions = process.env.GITHUB_ACTIONS;
    process.env.CI = "true";
    delete process.env.GITHUB_ACTIONS;
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    try {
      await runReport({
        root,
        format: "json",
        outPath: path.join(reportDir, "report.json"),
        profile: "discussion",
      });

      const written = stdout.mock.calls.map(([chunk]) => String(chunk)).join("");
      expect(written).toContain("full-scan");
    } finally {
      stdout.mockRestore();
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

  it("warns when --in holds a different profile than --profile (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const customPath = path.join(root, "custom", "validate.json");
    await writeValidationFixture(customPath, "prototyping", { info: 1, warning: 3, error: 0 });

    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    try {
      await runReport({
        root,
        format: "json",
        outPath: path.join(root, ".qfai", "report", "report.json"),
        inputPath: path.relative(root, customPath),
        profile: "sdd",
      });

      const written = stdout.mock.calls.map(([chunk]) => String(chunk)).join("");
      expect(written).toContain("sdd");
      expect(written).toContain("prototyping");
    } finally {
      stdout.mockRestore();
    }
  });

  it("writes validate-<profile>.json on the --run-validate path too (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const previousCi = process.env.CI;
    const previousGithubActions = process.env.GITHUB_ACTIONS;
    process.env.CI = "false";
    delete process.env.GITHUB_ACTIONS;

    try {
      const reportDir = path.join(root, ".qfai", "report");
      await runReport({
        root,
        format: "json",
        outPath: path.join(reportDir, "report.json"),
        runValidate: true,
        profile: "sdd",
      });

      const suffixed = JSON.parse(
        await readFile(path.join(reportDir, "validate-sdd.json"), "utf-8"),
      ) as { profile?: string; counts?: ValidationCounts };
      const latest = JSON.parse(await readFile(path.join(reportDir, "validate.json"), "utf-8")) as {
        profile?: string;
        counts?: ValidationCounts;
      };
      expect(suffixed.profile).toBe("sdd");
      expect(suffixed.counts).toEqual(latest.counts);

      // 接尾辞付きを書いたので、後続の読み取り経路が同じ結果を再利用できる。
      const followUpPath = path.join(reportDir, "report-follow-up.json");
      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await runReport({ root, format: "json", outPath: followUpPath, profile: "sdd" });
        expect(process.exitCode).toBeUndefined();
      } finally {
        process.exitCode = previousExitCode;
      }
      const followUp = JSON.parse(await readFile(followUpPath, "utf-8")) as {
        profile?: string;
      };
      expect(followUp.profile).toBe("sdd");
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

  it("bases the CI narrow-profile warning on the loaded profile (#667)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const reportDir = path.join(root, ".qfai", "report");
    const narrowInput = path.join(reportDir, "validate-prototyping.json");
    const fullInput = path.join(reportDir, "validate-full.json");
    await writeValidationFixture(narrowInput, "prototyping", { info: 0, warning: 0, error: 0 });
    await writeValidationFixture(fullInput, "full", { info: 0, warning: 0, error: 0 });

    const previousCi = process.env.CI;
    const previousGithubActions = process.env.GITHUB_ACTIONS;
    process.env.CI = "true";
    delete process.env.GITHUB_ACTIONS;
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    try {
      // --profile は allow-list 上だが、実際に読むのは narrow profile の成果物。
      await runReport({
        root,
        format: "json",
        outPath: path.join(reportDir, "report-narrow.json"),
        inputPath: path.relative(root, narrowInput),
        profile: "sdd",
      });
      expect(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("full-scan");

      // 逆向き: --profile は narrow だが、読むのは full-scan の成果物。
      stdout.mockClear();
      await runReport({
        root,
        format: "json",
        outPath: path.join(reportDir, "report-full.json"),
        inputPath: path.relative(root, fullInput),
        profile: "discussion",
      });
      expect(stdout.mock.calls.map(([chunk]) => String(chunk)).join("")).not.toContain("full-scan");
    } finally {
      stdout.mockRestore();
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
