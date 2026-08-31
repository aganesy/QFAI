import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

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

    const exitCode = await runReport({ root, format: "md" });

    expect(exitCode).toBe(2);
    await expect(readFile(reportPath, "utf-8")).rejects.toThrow();
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
      const exitCode = await runReport({
        root,
        format: "md",
        outPath: reportPath,
        runValidate: true,
        profile: "discussion",
        // `never` isolates the narrow-profile contract from the fixture's own
        // findings: a bare `qfai init` tree has no discussion pack, so this
        // run also carries an unrelated QFAI-DPACK-001 error. Under `never`
        // the only way to come back non-zero is a hard-coded narrow-profile
        // failure — exactly the #397 regression.
        failOn: "never",
      });

      const validationRaw = await readFile(validatePath, "utf-8");
      const validation = JSON.parse(validationRaw) as {
        issues?: Array<{ code?: string; severity?: string }>;
      };
      // The finding is appended to a real run. Exiting non-zero here made
      // every stage gate that names a narrow profile unreachable in CI, and
      // `qfai-discussion` names exactly this one as its only gate.
      // Asserted on the RETURN VALUE: `runReport` no longer touches
      // `process.exitCode`, so the old `process.exitCode` assertion passed
      // even if this contract regressed.
      expect(exitCode).toBe(0);
      const narrowProfileIssue = (validation.issues ?? []).find(
        (item) => item.code === "QFAI-VALIDATE-017",
      );
      expect(narrowProfileIssue).toBeDefined();
      // Severity is the other half of the contract: a warning can never fail
      // an `--fail-on error` run, so the stage gate stays reachable in CI.
      expect(narrowProfileIssue?.severity).toBe("warning");
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
      // Asserted on the RETURN VALUE: `runReport` reports its outcome through
      // the return value now, and `main.ts` is what assigns `process.exitCode`.
      const exitCode = await runReport({
        root,
        format: "md",
        specIds: ["0004"],
        inputPath: path.join(".qfai", "report", "validate.json"),
      });
      expect(exitCode).toBe(2);
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
      const exitCode = await runReport({ root, format: "md", specIds: ["0004"] });
      expect(exitCode).toBe(2);
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

    // The refusal is routed through the shared migration gate rather than a
    // pre-run early return, so the run completes and reports the defect: the
    // scoped report IS written and carries `D-DEPRECATED-PATH` at `error`,
    // which is what makes the exit code non-zero. The invariant this case
    // exists for is unchanged — nothing new is created under the sunset
    // directory, the scoped `validate.spec-0004.json` least of all.
    const exitCode = await runReport({
      root,
      format: "md",
      runValidate: true,
      specIds: ["0004"],
      failOn: "error",
      toolVersionOverride: "1.10.0",
    });
    expect(exitCode).toBe(1);

    // No new artifact was created under the sunset directory.
    await expect(
      readFile(path.join(root, ".qfai", "output", "validate.spec-0004.json"), "utf-8"),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(root, ".qfai", "output", "validate.json"), "utf-8"),
    ).rejects.toThrow();

    const report = await readFile(
      path.join(root, ".qfai", "report", "report.spec-0004.md"),
      "utf-8",
    );
    expect(report).toContain("D-DEPRECATED-PATH");
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
      const exitCode = await runReport({ root, format: "md", specIds: ["../outside"] });
      expect(exitCode).toBe(2);
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

describe("report exit code", { timeout: 15000 }, () => {
  type SeedCounts = { info: number; warning: number; error: number };

  /** Build the `issues[]` a given `counts` claims, so the two never disagree. */
  function issuesFor(counts: SeedCounts): Array<Record<string, string>> {
    const severities: Array<keyof SeedCounts> = ["info", "warning", "error"];
    return severities.flatMap((severity) =>
      Array.from({ length: counts[severity] }, (_unused, index) => ({
        code: `QFAI-SEED-${severity.toUpperCase()}`,
        severity,
        category: "canonical",
        message: `seeded ${severity} #${index}`,
      })),
    );
  }

  /**
   * Seed a `--in` file whose `issues` really carry the requested severities.
   * Replacing `counts` alone would leave the fixture's own bare-init findings
   * in `issues`, and the gate now recounts from `issues` — so a counts-only
   * fixture would assert against a number nothing in the report agrees with.
   */
  async function seedValidation(
    counts: SeedCounts,
    overrides: { keepIssues?: boolean } = {},
  ): Promise<{ root: string; inputPath: string }> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-gate-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await runValidate({ root, strict: false, failOn: "never", format: "github" });

    const validatePath = path.join(root, ".qfai", "report", "validate.json");
    const parsed = JSON.parse(await readFile(validatePath, "utf-8")) as { counts: unknown };
    const inputPath = path.join(root, ".qfai", "report", "validate.seeded.json");
    const seeded = overrides.keepIssues
      ? { ...parsed, counts }
      : { ...parsed, issues: issuesFor(counts), counts };
    await writeFile(inputPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf-8");
    return { root, inputPath };
  }

  it("exits 1 when the report carries an error and failOn defaults to error", async () => {
    const { root, inputPath } = await seedValidation({ info: 4, warning: 5, error: 1 });

    const exitCode = await runReport({ root, format: "md", inputPath });

    expect(exitCode).toBe(1);
  });

  it("honours --fail-on never on a report that carries an error", async () => {
    const { root, inputPath } = await seedValidation({ info: 0, warning: 0, error: 1 });

    const exitCode = await runReport({ root, format: "md", inputPath, failOn: "never" });

    expect(exitCode).toBe(0);
  });

  it("honours --strict on a report that carries only warnings", async () => {
    const { root, inputPath } = await seedValidation({ info: 0, warning: 2, error: 0 });

    expect(await runReport({ root, format: "md", inputPath })).toBe(0);
    expect(await runReport({ root, format: "md", inputPath, strict: true })).toBe(1);
  });

  it("still writes the report artifact when the gate fails", async () => {
    const { root, inputPath } = await seedValidation({ info: 0, warning: 0, error: 3 });
    const reportPath = path.join(root, ".qfai", "report", "gated.md");

    const exitCode = await runReport({ root, format: "md", inputPath, outPath: reportPath });

    expect(exitCode).toBe(1);
    await expect(readFile(reportPath, "utf-8")).resolves.toContain("# QFAI Report");
  });

  it("recounts from issues when the input's counts are stale", async () => {
    // `--in` reads a file the gate does not own: a stale or hand-edited
    // `counts` block that zeroes out errors the `issues[]` still lists would
    // otherwise print those errors in the report and exit 0 anyway.
    const { root, inputPath } = await seedValidation(
      { info: 0, warning: 0, error: 0 },
      { keepIssues: true },
    );
    const seeded = JSON.parse(await readFile(inputPath, "utf-8")) as {
      issues: Array<{ severity: string; suppressed?: boolean }>;
    };
    expect(
      seeded.issues.some((issue) => issue.severity === "error" && issue.suppressed !== true),
    ).toBe(true);

    expect(await runReport({ root, format: "md", inputPath })).toBe(1);
    expect(await runReport({ root, format: "md", inputPath, failOn: "never" })).toBe(0);
  });

  it("rejects an input whose issues carry an unknown severity", async () => {
    const { root, inputPath } = await seedValidation({ info: 0, warning: 0, error: 0 });
    const parsed = JSON.parse(await readFile(inputPath, "utf-8")) as Record<string, unknown>;
    await writeFile(
      inputPath,
      `${JSON.stringify(
        {
          ...parsed,
          issues: [
            { code: "QFAI-SEED-BOGUS", severity: "fatal", category: "canonical", message: "x" },
          ],
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    // Counting an unrecognised severity would quietly drop it from the gate.
    await expect(runReport({ root, format: "md", inputPath })).rejects.toThrow(
      /validate\.json の形式が不正です/,
    );
  });

  it("rejects an input whose suppressed flag is not a boolean", async () => {
    // `countIssues` tests `suppressed` for truthiness, so the string "false"
    // suppresses. An error carrying one drops out of the recount and takes the
    // gate's only reason to fail with it — a bypass spelled in the very field
    // that is supposed to be an explicit, auditable decision.
    const { root, inputPath } = await seedValidation({ info: 0, warning: 0, error: 0 });
    const parsed = JSON.parse(await readFile(inputPath, "utf-8")) as Record<string, unknown>;
    const bogus = {
      code: "QFAI-SEED-ERROR",
      severity: "error",
      category: "canonical",
      message: "should gate",
      suppressed: "false",
    };
    await writeFile(
      inputPath,
      `${JSON.stringify({ ...parsed, issues: [bogus] }, null, 2)}\n`,
      "utf-8",
    );

    await expect(runReport({ root, format: "md", inputPath })).rejects.toThrow(
      /validate\.json の形式が不正です/,
    );
  });

  it("keeps an honest boolean suppression working", async () => {
    // The rejection above must not cost the field its actual purpose: a real
    // `suppressed: true` still keeps its issue out of the gate.
    const { root, inputPath } = await seedValidation({ info: 0, warning: 0, error: 0 });
    const parsed = JSON.parse(await readFile(inputPath, "utf-8")) as Record<string, unknown>;
    const issue = (suppressed: boolean): Record<string, unknown> => ({
      code: "QFAI-SEED-ERROR",
      severity: "error",
      category: "canonical",
      message: "waived",
      suppressed,
    });

    await writeFile(
      inputPath,
      `${JSON.stringify({ ...parsed, issues: [issue(true)] }, null, 2)}\n`,
      "utf-8",
    );
    expect(await runReport({ root, format: "md", inputPath })).toBe(0);

    await writeFile(
      inputPath,
      `${JSON.stringify({ ...parsed, issues: [issue(false)] }, null, 2)}\n`,
      "utf-8",
    );
    expect(await runReport({ root, format: "md", inputPath })).toBe(1);
  });
});

describe("report --run-validate shares the validate migration gate", { timeout: 30000 }, () => {
  /**
   * `report --run-validate` is the documented single-step CI usage, so it owes
   * the operator the same legacy-path migration gate `qfai validate` applies.
   * Before the gate was shared it ran `validateProject` alone: the
   * `D-DEPRECATED-PATH` finding never reached the report, and the writer
   * re-created the deprecated `.qfai/output/validate.json` that validate
   * refuses post-sunset.
   */
  async function seedLegacyConfig(root: string): Promise<void> {
    const yaml = ["output:", "  validateJsonPath: .qfai/output/validate.json", ""].join("\n");
    await writeFile(path.join(root, "qfai.config.yaml"), yaml, "utf-8");
  }

  it("AT sunset: refuses the legacy write and carries D-DEPRECATED-PATH as an error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-legacycfg-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedLegacyConfig(root);
      const outPath = path.join(root, ".qfai", "report", "report.json");

      const exitCode = await runReport({
        root,
        format: "json",
        outPath,
        runValidate: true,
        failOn: "error",
        toolVersionOverride: "1.10.0",
      });

      expect(exitCode).toBe(1);
      // The writer refused: the deprecated path must not be re-created.
      await expect(
        readFile(path.join(root, ".qfai", "output", "validate.json"), "utf-8"),
      ).rejects.toThrow();
      const report = JSON.parse(await readFile(outPath, "utf-8")) as {
        issues: Array<{ code: string; severity: string; message: string }>;
      };
      const deprecation = report.issues.find((issue) => issue.code === "D-DEPRECATED-PATH");
      expect(deprecation?.severity).toBe("error");
      expect(deprecation?.message).toContain("REFUSED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("PRE sunset: writes the configured legacy path and warns instead of erroring", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-legacycfg-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await seedLegacyConfig(root);

      const exitCode = await runReport({
        root,
        format: "md",
        runValidate: true,
        // `never` isolates the gate from the fixture's unrelated
        // QFAI-DPACK-001 error; the deprecation severity is asserted below.
        failOn: "never",
        toolVersionOverride: "1.9.1",
      });

      expect(exitCode).toBe(0);
      const written = JSON.parse(
        await readFile(path.join(root, ".qfai", "output", "validate.json"), "utf-8"),
      ) as { issues: Array<{ code: string; severity: string }> };
      const deprecation = written.issues.find((issue) => issue.code === "D-DEPRECATED-PATH");
      expect(deprecation?.severity).toBe("warning");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
