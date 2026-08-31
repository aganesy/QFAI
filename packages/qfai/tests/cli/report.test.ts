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

  it("scopes input, output and spec-pack artifacts to --spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const specsRoot = path.join(root, ".qfai", "specs");
    for (const specName of ["spec-0003", "spec-0004"]) {
      const specDir = path.join(specsRoot, specName);
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), `# ${specName}\n`, "utf-8");
      await writeFile(path.join(specDir, "02_User-Stories.md"), `# ${specName} US\n`, "utf-8");
    }

    const reportRoot = path.join(root, ".qfai", "report");
    // Worker 0004's slice: `validate --spec` writes only its own scoped file.
    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
      specIds: ["0004"],
    });
    await rm(path.join(reportRoot, "validate.json"), { force: true });

    // Sibling worker 0003's artifact. A repo-wide `report` rewrites it.
    const siblingCoverage = path.join(reportRoot, "spec-0003", "coverage.md");
    await mkdir(path.dirname(siblingCoverage), { recursive: true });
    await writeFile(siblingCoverage, "SENTINEL\n", "utf-8");

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({ root, format: "md", specIds: ["0004"] });
      expect(process.exitCode).not.toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    // Input defaulted to validate.spec-0004.json, output to the matching name.
    const scopedReport = await readFile(path.join(reportRoot, "report.spec-0004.md"), "utf-8");
    expect(scopedReport).toContain("# QFAI Report");
    await expect(readFile(path.join(reportRoot, "report.md"), "utf-8")).rejects.toThrow();

    // Only the scoped pack's artifacts were rewritten.
    expect(await readFile(siblingCoverage, "utf-8")).toBe("SENTINEL\n");
    const ownCoverage = await readFile(path.join(reportRoot, "spec-0004", "coverage.md"), "utf-8");
    expect(ownCoverage).toContain("# Coverage (spec-0004)");
  });

  it("keeps sibling specs out of the scoped report body", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const specsRoot = path.join(root, ".qfai", "specs");
    for (const specName of ["spec-0003", "spec-0004"]) {
      const specDir = path.join(specsRoot, specName);
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), `# ${specName}\n`, "utf-8");
    }

    const reportRoot = path.join(root, ".qfai", "report");
    await runReport({
      root,
      format: "json",
      runValidate: true,
      outPath: path.join(reportRoot, "all.json"),
    });
    await runReport({
      root,
      format: "json",
      runValidate: true,
      specIds: ["0004"],
      outPath: path.join(reportRoot, "scoped.json"),
    });

    const unscoped = JSON.parse(await readFile(path.join(reportRoot, "all.json"), "utf-8")) as {
      summary: { specs: number };
    };
    const scoped = JSON.parse(await readFile(path.join(reportRoot, "scoped.json"), "utf-8")) as {
      summary: { specs: number };
      issues: Array<{ file?: string }>;
    };

    // The body is assembled from the scope, not from a fresh repo-wide walk:
    // before this, `report.spec-0004.*` counted every sibling spec in the repo.
    expect(scoped.summary.specs).toBe(1);
    expect(unscoped.summary.specs).toBeGreaterThan(scoped.summary.specs);
    expect(scoped.issues.some((issue) => (issue.file ?? "").includes("spec-0003"))).toBe(false);
  });

  it("refuses an --in whose scope does not match --spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const specsRoot = path.join(root, ".qfai", "specs");
    for (const specName of ["spec-0003", "spec-0004"]) {
      const specDir = path.join(specsRoot, specName);
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), `# ${specName}\n`, "utf-8");
    }

    // A repo-wide validate result: its counts / issues / SC coverage cover
    // every spec, and `--in` adopts them verbatim.
    await runValidate({ root, strict: false, failOn: "never", format: "github" });

    const messages: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      messages.push(String(chunk));
      return true;
    });
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({
        root,
        format: "md",
        specIds: ["0004"],
        inputPath: path.join(".qfai", "report", "validate.json"),
      });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
      stderrSpy.mockRestore();
    }

    const combined = messages.join("\n");
    expect(combined).toContain("validate.spec-0004.json");
    // The scoped name must not be written from an unscoped body.
    await expect(
      readFile(path.join(root, ".qfai", "report", "report.spec-0004.md"), "utf-8"),
    ).rejects.toThrow();
  });

  it("accepts a relocated --in that still carries the requested scope", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const specDir = path.join(root, ".qfai", "specs", "spec-0004");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# spec-0004\n", "utf-8");

    await runValidate({
      root,
      strict: false,
      failOn: "never",
      format: "github",
      specIds: ["0004"],
    });

    const reportRoot = path.join(root, ".qfai", "report");
    const scopedInput = path.join(reportRoot, "validate.spec-0004.json");
    const relocated = path.join(root, "custom", "validate.spec-0004.json");
    await mkdir(path.dirname(relocated), { recursive: true });
    await writeFile(relocated, await readFile(scopedInput, "utf-8"), "utf-8");
    await rm(scopedInput, { force: true });

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({
        root,
        format: "md",
        specIds: ["0004"],
        inputPath: path.relative(root, relocated),
      });
      expect(process.exitCode).not.toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    const scopedReport = await readFile(path.join(reportRoot, "report.spec-0004.md"), "utf-8");
    expect(scopedReport).toContain("# QFAI Report");
  });

  it("points a missing scoped input at the matching scoped validate command", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const messages: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      messages.push(String(chunk));
      return true;
    });
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({ root, format: "md", specIds: ["0004"] });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
      stderrSpy.mockRestore();
    }

    const combined = messages.join("\n");
    // Following the old text (`qfai validate`) never produced the scoped input.
    expect(combined).toContain("validate.spec-0004.json");
    expect(combined).toContain("qfai validate --spec 0004");
    expect(combined).toContain("qfai report --spec 0004 --run-validate");
  });

  it("refuses --run-validate writes when the config still targets the legacy SSOT", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["output:", "  validateJsonPath: .qfai/output/validate.json", ""].join("\n"),
      "utf-8",
    );

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({
        root,
        format: "md",
        runValidate: true,
        specIds: ["0004"],
        toolVersionOverride: "1.10.0",
      });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    // No new artifact was created under the sunset directory.
    await expect(
      readFile(path.join(root, ".qfai", "output", "validate.spec-0004.json"), "utf-8"),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(root, ".qfai", "report", "report.spec-0004.md"), "utf-8"),
    ).rejects.toThrow();
  });

  it("still writes --run-validate output while the legacy config is pre-sunset", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["output:", "  validateJsonPath: .qfai/output/validate.json", ""].join("\n"),
      "utf-8",
    );

    await runReport({
      root,
      format: "md",
      runValidate: true,
      toolVersionOverride: "1.9.0",
    });

    const validation = await readFile(path.join(root, ".qfai", "output", "validate.json"), "utf-8");
    expect(validation).toContain('"toolVersion"');
  });

  it("refuses an unresolvable --spec value instead of writing a shared name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    await runValidate({ root, strict: false, failOn: "never", format: "github" });

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await runReport({ root, format: "md", specIds: ["../outside"] });
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }

    await expect(
      readFile(path.join(root, ".qfai", "report", "report.md"), "utf-8"),
    ).rejects.toThrow();
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
