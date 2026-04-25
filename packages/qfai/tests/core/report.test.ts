import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createReportData, formatReportMarkdown, type ReportData } from "../../src/core/report.js";
import type { Issue, ValidationResult } from "../../src/core/types.js";

describe("report contract coverage", () => {
  it("includes orphan contracts, none specs, and missing contract-ref specs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");
    const dbDir = path.join(root, ".qfai", "contracts", "db");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });
    await mkdir(dbDir, { recursive: true });

    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001", "CON-UI-0001");
    await writeSpecPack(specsRoot, "spec-0002", "SPEC-0002", "none");
    await writeSpecPack(specsRoot, "spec-0003", "SPEC-0003");

    await writeFile(path.join(uiDir, "ui-0001-sample.yaml"), "# QFAI-CONTRACT-ID: CON-UI-0001\n");
    await writeFile(path.join(dbDir, "db-0001-sample.sql"), "-- QFAI-CONTRACT-ID: CON-DB-0001\n");

    const validation: ValidationResult = {
      toolVersion: "test",
      issues: [],
      counts: { info: 0, warning: 0, error: 0 },
      traceability: {
        sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
        testFiles: {
          globs: [],
          excludeGlobs: [],
          matchedFileCount: 0,
          truncated: false,
          limit: 20000,
        },
      },
    };

    const data = await createReportData(root, validation);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## Decision Guardrails");
    expect(markdown).toContain("## Contract Coverage");
    expect(markdown).toContain("- total: 2");
    expect(markdown).toContain("- orphan: 1");
    expect(markdown).toContain("### Contract → Spec");
    expect(markdown).toContain("- CON-UI-0001: SPEC-0001");
    expect(markdown).toContain("- CON-DB-0001: (none)");
    expect(markdown).toContain("### Spec → Contracts");
    expect(markdown).toContain("| Spec      | Status   | Contracts");
    expect(markdown).toContain("| SPEC-0001 | declared | CON-UI-0001");
    expect(markdown).toContain("| SPEC-0002 | declared | (none)");
    expect(markdown).toContain("| SPEC-0003 | missing  | (missing)");
    expect(markdown).toContain("### Specs missing contract-ref");
    expect(markdown).toContain("- SPEC-0003");
    expect(markdown).not.toContain("- SPEC-0003:");
  });

  it("does not fallback to file path when SPEC id is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });

    const specPackDir = path.join(specsRoot, "spec-0001");
    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(specPackDir, "01_Spec.md"),
      [
        "# Sample Spec",
        "",
        "QFAI-CONTRACT-REF: CON-UI-0001",
        "",
        "## 業務ルール",
        "",
        "- [BR-0001-0001][P1] sample",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "18_delta.md"),
      ["# Delta", "", "- 区分: Compatibility", ""].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "09_Examples.feature"),
      [
        "@SPEC-0001",
        "Feature: Sample",
        "# QFAI-CONTRACT-REF: CON-UI-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: Basic",
        "    Given ...",
        "",
      ].join("\n"),
    );
    await writeFile(path.join(uiDir, "ui-0001-sample.yaml"), "# QFAI-CONTRACT-ID: CON-UI-0001\n");

    const data = await createReportData(root);
    const markdown = formatReportMarkdown(data);
    const specSection = extractSection(markdown, "### Spec → Contracts");

    expect(specSection).toContain("- (none)");
    expect(specSection).not.toContain("spec-0001/01_Spec.md");
  });

  it("uses specsDir from config when scanning guardrails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, "custom-specs");
    const specPackDir = path.join(specsRoot, "spec-0001");

    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      [
        "paths:",
        "  specsDir: custom-specs",
        "  contractsDir: .qfai/contracts",
        "  requireDir: .qfai/require",
        "  outDir: .qfai/report",
        "  skillsDir: .qfai/assistant/skills",
        "  srcDir: src",
        "  testsDir: tests",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specPackDir, "01_Spec.md"),
      ["# SPEC-0001: Sample", "", "## 業務ルール", "", "- [BR-0001-0001][P1] sample"].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specPackDir, "18_delta.md"),
      [
        "# SPEC-0001: Delta",
        "",
        "## Decision Guardrails",
        "",
        "- ID: DG-0001",
        "  Type: non-goal",
        "  Guardrail: Do not change the spec layout.",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specPackDir, "09_Examples.feature"),
      ["@SPEC-0001", "Feature: Sample", "  Scenario: Basic", "    Given ...", ""].join("\n"),
      "utf-8",
    );

    const data = await createReportData(root);
    expect(data.guardrails.total).toBe(1);
  });

  it("links paths when baseUrl is provided", () => {
    const data = createReportDataForLinks();
    const markdown = formatReportMarkdown(data, {
      baseUrl: "https://example.com/repo/",
    });

    expect(markdown).toContain("- ルート: [.](https://example.com/repo)");
    expect(markdown).toContain(
      "- 設定: [qfai.config.yaml](https://example.com/repo/qfai.config.yaml)",
    );
    expect(markdown).toContain(
      "- file: [specs/with space/テスト.md](https://example.com/repo/specs/with%20space/%E3%83%86%E3%82%B9%E3%83%88.md):12",
    );
    expect(markdown).not.toContain("https://example.com/repo//specs");
  });

  it("keeps raw paths when baseUrl is omitted", () => {
    const data = createReportDataForLinks();
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("- ルート: .");
    expect(markdown).toContain("- 設定: qfai.config.yaml");
    expect(markdown).toContain("- file: specs/with space/テスト.md:12");
  });

  it("renders compat/scope/verification findings in change type section", () => {
    const data = createReportDataForLinks();
    data.changeType.compatFindings = [
      {
        code: "QFAI-COMPAT-004",
        severity: "warning",
        file: ".qfai/specs/spec-0001/18_delta.md",
        message: "compat mismatch sample",
        suggestion: "set compat=Change",
        refs: [".qfai/specs/spec-0001/09_Examples.feature"],
      },
    ];
    data.changeType.scopeMismatches = [
      {
        code: "QFAI-SCOPE-001",
        severity: "warning",
        file: ".qfai/specs/spec-0001/18_delta.md",
        message: "scope mismatch sample",
        suggestion: "add contracts/api",
        refs: [".qfai/contracts/api/openapi.yaml"],
      },
    ];
    data.changeType.verificationFindings = [
      {
        code: "QFAI-VFY-006",
        severity: "warning",
        file: ".qfai/specs/spec-0001/18_delta.md",
        message: "verification missing acceptance/manual",
        suggestion: "add acceptance item",
        refs: ["DL-20260207-01"],
      },
    ];
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("### COMPAT findings");
    expect(markdown).toContain("[QFAI-COMPAT-004]");
    expect(markdown).toContain("### Scope mismatch");
    expect(markdown).toContain("[QFAI-SCOPE-001]");
    expect(markdown).toContain("### Verification findings");
    expect(markdown).toContain("[QFAI-VFY-006]");
  });

  it("renders waiver sections", () => {
    const data = createReportDataForLinks();
    data.waivers.active = [
      {
        id: "WVR-20260208-01",
        rule: "COMPAT-003",
        scope: { paths: [".qfai/specs/spec-0001/**"] },
        action: "suppress",
        match: { dl_ids: ["DL-20260208-01"] },
        reason: "temporary suppression",
        expires: "2026-03-01",
        evidence: "18_delta.md#DL-20260208-01",
        owner: "team-qfai",
      },
    ];
    data.waivers.suppressed = {
      total: 2,
      byWaiver: {
        "WVR-20260208-01": 2,
      },
      byRule: {
        "COMPAT-003": 2,
      },
    };
    data.waivers.expired = [
      {
        code: "QFAI-WAIVER-003",
        severity: "warning",
        file: ".qfai/waivers.yml",
        message: "expired waiver",
        refs: ["WVR-20260207-01"],
      },
    ];

    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## Waivers");
    expect(markdown).toContain("### Expired Waivers");
    expect(markdown).toContain("[QFAI-WAIVER-003]");
    expect(markdown).toContain("### Active Waivers");
    expect(markdown).toContain("WVR-20260208-01");
    expect(markdown).toContain("### Suppressed Summary");
    expect(markdown).toContain("#### By waiver");
    expect(markdown).toContain("#### By rule");
    expect(markdown).toContain("COMPAT-003: 2");
  });

  it("adds render evidence recovery guidance when prototyping issues are present", () => {
    const data = createReportDataForLinks();
    data.issues.push({
      code: "QFAI-PROT-245",
      severity: "warning",
      category: "canonical",
      message: "render coverage is incomplete",
      file: ".qfai/evidence/prototyping.json",
      suggested_action: "rerun prototyping with render evidence",
    });
    data.summary.counts.warning = 2;

    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("render evidence が不足または不完全です");
    expect(markdown).toContain(
      "recover: `/qfai-prototyping` を再実行し、宣言された screen ごとの screenshot と HTML snapshot を再取得してください。",
    );
    expect(markdown).toContain("why it matters");
  });

  it("renders prototyping summary when evidence metadata is available", () => {
    const data = createReportDataForLinks();
    data.prototyping = {
      mode: {
        requested: "full-harness",
        effective: "full-harness",
        source: "explicit-request",
        rationale: "runtime proof requested",
        surface: "web",
      },
      evidence: {
        specsCoverageStatus: "complete",
        runtimeGate: { present: true, required: true },
        uiFidelity: { present: true, required: true },
        renderBundle: { present: true, required: true },
        browserQaBundle: { present: true, required: true },
        obligationProfile: "web/full-harness",
      },
      fullHarness: {
        enabled: true,
        available: true,
        runId: "fh-1",
        iterationCount: 2,
        bestIteration: 2,
        terminationReason: "converged",
        reviewerSignoffStatus: "approved",
      },
      render: {
        status: "captured",
        requested: true,
        captured: 2,
        skipped: 0,
        failed: 0,
        malformed: false,
      },
      browserQa: {
        status: "completed",
        executed: true,
        findingsBySeverity: { error: 1, warning: 0, info: 0 },
      },
    };

    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## Prototyping");
    expect(markdown).toContain("### prototyping.mode");
    expect(markdown).toContain("- effective: full-harness");
    expect(markdown).toContain("- source: explicit-request");
    expect(markdown).toContain("### prototyping.evidence");
    expect(markdown).toContain("- obligation profile: web/full-harness");
    expect(markdown).toContain("### prototyping.fullHarness");
    expect(markdown).toContain("- terminationReason: converged");
  });

  it("ignores legacy discussion artifact fields when prototyping summary is generated", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const discussionDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(discussionDir, { recursive: true });

    // Seed valid spec pack for report to find
    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001");

    // Seed discussion pack with non-object namespaced prototyping.yaml
    await writeFile(
      path.join(discussionDir, "prototyping.yaml"),
      [
        "recommended_mode: bogus",
        "rationale: invalid legacy",
        "allowed_modes:",
        "  - bogus",
        "surface: web",
        "prototyping:",
        "  invalid: true",
        "",
      ].join("\n"),
      "utf-8",
    );

    // Seed minimal evidence so prototyping summary is generated
    const evidenceRoot = path.join(root, ".qfai", "evidence");
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(path.join(evidenceRoot, "prototyping.md"), "# Evidence\n", "utf-8");
    await writeFile(
      path.join(evidenceRoot, "prototyping.json"),
      JSON.stringify({
        surface: "web",
        specs: [
          {
            specId: "spec-0001",
            declared: { uiRoutes: 0, apiEndpoints: 1, dbObjects: 1 },
            checked: { uiOk: 0, apiNon404: 1, dbPresent: 1 },
            missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
          },
        ],
        mode: {
          effective: "full-harness",
          source: "system-default",
          rationale: "default full-harness mode",
        },
        meta: { generatedAt: "2026-04-04T00:00:00Z", toolVersion: "test", commands: [] },
      }),
      "utf-8",
    );

    const data = await createReportData(root);
    expect(data.prototyping).toBeDefined();
    expect(data.prototyping?.mode.effective).toBe("full-harness");
    expect(data.prototyping?.mode.source).toBe("system-default");

    const markdown = formatReportMarkdown(data);
    expect(markdown).toContain("### prototyping.mode");
    expect(markdown).toContain("- effective: full-harness");
    expect(markdown).not.toContain("### prototyping.recommendationArtifact");
    expect(markdown).not.toContain("discussion recommendation");
    expect(markdown).not.toContain("allowed_modes");
    expect(markdown).not.toContain("source schema");

    await rm(root, { recursive: true, force: true });
  });

  it("omits prototyping summary when the latest discussion pack is non-ui", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const discussionDir = path.join(root, ".qfai", "discussion", "discussion-20260405000000000");
    const evidenceRoot = path.join(root, ".qfai", "evidence");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(discussionDir, { recursive: true });
    await mkdir(evidenceRoot, { recursive: true });
    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001");
    await writeFile(
      path.join(discussionDir, "01_Context.md"),
      [
        "# Context",
        "",
        "- ui_bearing: false",
        "- primary_surface: non-ui",
        "- secondary_surfaces:",
        "- classification_rationale: internal library change only",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(path.join(evidenceRoot, "prototyping.md"), "# Evidence\n", "utf-8");
    await writeFile(
      path.join(evidenceRoot, "prototyping.json"),
      JSON.stringify({
        surface: "web",
        specs: [],
        mode: {
          effective: "full-harness",
          source: "discussion-recommendation",
          rationale: "stale ui evidence",
        },
      }),
      "utf-8",
    );

    const data = await createReportData(root);
    expect(data.prototyping).toBeDefined();
    expect(data.prototyping?.mode.effective).toBe("full-harness");
    expect(data.prototyping?.mode.source).toBe("discussion-recommendation");

    await rm(root, { recursive: true, force: true });
  });

  it("summarizes round-based prototyping evidence in report data", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-v2-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const evidenceRoot = path.join(root, ".qfai", "evidence");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(evidenceRoot, { recursive: true });
    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001");
    await writeFile(path.join(evidenceRoot, "prototyping.md"), "# Evidence\n", "utf-8");
    await writeFile(
      path.join(evidenceRoot, "prototyping.json"),
      JSON.stringify({
        schemaVersion: "2.0",
        surface: "web",
        specs: [{ specId: "spec-0001" }],
        mode: {
          effective: "standard",
          source: "explicit-request",
          rationale: "round workflow selected",
        },
        rounds: [
          {
            round: "r5",
            candidates: [{ candidateId: "c1" }, { candidateId: "c2" }, { candidateId: "c3" }],
            harvestRef: ".qfai/evidence/prototyping/rounds/r5/harvest.json",
            narrowDecisionRef: ".qfai/evidence/prototyping/rounds/r5/narrow-decision.json",
            absorptionPlanRef: null,
            reimplementationRef: null,
            allAxesPerfect100: false,
          },
          {
            round: "r3",
            candidates: [{ candidateId: "c1" }, { candidateId: "c2" }],
            harvestRef: ".qfai/evidence/prototyping/rounds/r3/harvest.json",
            narrowDecisionRef: ".qfai/evidence/prototyping/rounds/r3/narrow-decision.json",
            absorptionPlanRef: ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
            reimplementationRef: ".qfai/evidence/prototyping/rounds/r3/reimplementation.json",
            allAxesPerfect100: true,
          },
        ],
        polishCycles: [
          {
            cycle: 1,
            kind: "polish",
            allAxesPerfect100: false,
          },
          {
            cycle: 2,
            kind: "completed",
            allAxesPerfect100: true,
          },
        ],
      }),
      "utf-8",
    );

    const data = await createReportData(root);

    expect(data.prototyping?.roundLifecycle).toEqual({
      schemaVersion: "2.0",
      rounds: 2,
      roundIds: ["r5", "r3"],
      candidatesObserved: 5,
      perfectRounds: 1,
      harvestArtifacts: 2,
      narrowDecisions: 2,
      absorptionPlans: 1,
      reimplementations: 1,
      polishCycles: 2,
      completedPolishCycles: 1,
      perfectPolishCycles: 1,
      polishKinds: {
        polish: 1,
        completed: 1,
      },
    });

    const markdown = formatReportMarkdown(data);
    expect(markdown).toContain("### prototyping.roundLifecycle");
    expect(markdown).toContain("- round ids: r5, r3");
    expect(markdown).toContain("- reimplementations: 1");
    expect(markdown).toContain("- polish kinds: polish=1, completed=1");

    await rm(root, { recursive: true, force: true });
  });

  it("excludes suppressed issues from summary table counts", () => {
    const data = createReportDataForLinks();
    data.summary.counts = { info: 0, warning: 0, error: 0 };
    data.issues = [
      {
        code: "QFAI-TEST-000",
        severity: "warning",
        category: "canonical",
        message: "suppressed link test",
        file: "specs/with space/テスト.md",
        loc: { line: 12 },
        suppressed: true,
      },
    ];

    const markdown = formatReportMarkdown(data);
    expect(markdown).toContain("- issues(canonical): info 0 / warning 0 / error 0");
    expect(markdown).not.toContain("| warning | QFAI-TEST-000 | 1 |");
  });

  it("counts scenarios across 09_Examples.feature files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-core-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const uiDir = path.join(root, ".qfai", "contracts", "ui");

    await mkdir(specsRoot, { recursive: true });
    await mkdir(uiDir, { recursive: true });

    await writeSpecPack(specsRoot, "spec-0001", "SPEC-0001", "CON-UI-0001");
    await writeFile(
      path.join(specsRoot, "spec-0001", "09_Examples.feature"),
      [
        "@SPEC-0001",
        "Feature: Sample",
        "# QFAI-CONTRACT-REF: CON-UI-0001",
        "  @SC-0001-0001 @BR-0001-0001",
        "  Scenario: One",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
        "  @SC-0001-0002 @BR-0001-0001",
        "  Scenario: Two",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );
    await writeFile(path.join(uiDir, "ui-0001-sample.yaml"), "# QFAI-CONTRACT-ID: CON-UI-0001\n");

    const data = await createReportData(root);
    expect(data.summary.scenarios).toBe(2);
  });

  it("marks E2E guardrails when thresholds are exceeded", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-e2e-"));
    const specsRoot = path.join(root, ".qfai", "specs");
    const specPackDir = path.join(specsRoot, "spec-0001");

    await mkdir(specPackDir, { recursive: true });
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      [
        "paths:",
        "  specsDir: .qfai/specs",
        "  contractsDir: .qfai/contracts",
        "  requireDir: .qfai/require",
        "  outDir: .qfai/report",
        "  skillsDir: .qfai/assistant/skills",
        "  srcDir: src",
        "  testsDir: tests",
        "validation:",
        "  failOn: error",
        "  require:",
        "    specSections: []",
        "  testStrategy:",
        "    requireLayerTags: false",
        "    requireSizeTags: false",
        "    maxE2eScenarioRatio: 0.2",
        "    maxE2eScenarioCount: 0",
        "  traceability:",
        "    brMustHaveSc: true",
        "    scMustHaveTest: true",
        "    testFileGlobs: []",
        "    testFileExcludeGlobs: []",
        "    scNoTestSeverity: error",
        "    orphanContractsPolicy: error",
        "    unknownContractIdSeverity: error",
        "output:",
        "  validateJsonPath: .qfai/report/validate.json",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specPackDir, "01_Spec.md"),
      [
        "# SPEC-0001: Sample",
        "",
        "QFAI-CONTRACT-REF: none",
        "",
        "## 業務ルール",
        "",
        "- [BR-0001-0001][P1] sample",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "18_delta.md"),
      ["# Delta", "", "- 区分: Compatibility", ""].join("\n"),
    );
    await writeFile(
      path.join(specPackDir, "09_Examples.feature"),
      [
        "@SPEC-0001",
        "Feature: Sample",
        "# QFAI-CONTRACT-REF: none",
        "  @SC-0001-0001 @BR-0001-0001 @layer-e2e @size-s",
        "  Scenario: E2E scenario",
        "    Given ...",
        "    When ...",
        "    Then ...",
        "",
      ].join("\n"),
    );

    const data = await createReportData(root);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("### E2E guardrails (warning)");
    expect(markdown).toContain("- warning: layer-e2e の比率が上限を超過しています。");
    expect(markdown).toContain("- warning: layer-e2e の件数が上限を超過しています。");
  });

  it("renders TDD coverage section with correct counts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-tdd-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      const tddDir = path.join(specDir, "tdd");

      await mkdir(tddDir, { recursive: true });
      await mkdir(path.join(specsRoot, "_policies"), { recursive: true });

      await writeFile(
        path.join(specDir, "01_Spec.md"),
        "# SPEC-0001: TDD Test\nQFAI-CONTRACT-REF: none\n\n## 業務ルール\n\n- [BR-0001-0001][P1] sample\n",
      );
      await writeFile(
        path.join(specDir, "18_delta.md"),
        "# SPEC-0001: Delta\n\n- 区分: Compatibility\n",
      );
      await writeFile(
        path.join(specDir, "09_Examples.feature"),
        "@SPEC-0001\nFeature: Sample\n# QFAI-CONTRACT-REF: none\n  @SC-0001-0001 @BR-0001-0001\n  Scenario: Basic\n    Given ...\n",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |",
          "| ----- | ----- | ------- | ------ | ----- | -------- | ----- |",
          "| TC-0001 | unit | AC-0001 | EX-0001 | step | expected | |",
          "| TC-0002 | component | AC-0002 | EX-0002 | step | expected | |",
          "| TC-0003 | integration | AC-0003 | EX-0003 | step | expected | |",
        ].join("\n"),
      );
      await writeFile(
        path.join(tddDir, "test-list.md"),
        [
          "# TDD Execution Ledger",
          "",
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | test1 | todo | | ev |",
          "| TDD-0002 | TC-0002 | component | | test2 | exception | DR-0042 | |",
        ].join("\n"),
      );

      const data = await createReportData(root);
      const markdown = formatReportMarkdown(data);

      expect(markdown).toContain("## TDD Coverage");
      expect(markdown).toContain("### spec-0001");
      expect(markdown).toContain("coverage-target TCs: 2");
      expect(markdown).toContain("done: 0");
      expect(markdown).toContain("exception: 1");
      expect(markdown).toContain("open: 1");
      expect(markdown).not.toContain("missing TC refs");
      expect(markdown).toContain("exception rows:");
      expect(markdown).toContain("TDD-0002: DR-ID=DR-0042");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("shows 0 coverage-target TCs for integration-only spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-zero-tc-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0002");
      const tddDir = path.join(specDir, "tdd");
      await mkdir(tddDir, { recursive: true });
      await mkdir(path.join(specsRoot, "_policies"), { recursive: true });

      await writeFile(
        path.join(specDir, "01_Spec.md"),
        "# SPEC-0002: Integration\nQFAI-CONTRACT-REF: none\n\n## 業務ルール\n\n- [BR-0002-0001][P1] sample\n",
      );
      await writeFile(
        path.join(specDir, "18_delta.md"),
        "# SPEC-0002: Delta\n\n- 区分: Compatibility\n",
      );
      await writeFile(
        path.join(specDir, "09_Examples.feature"),
        "@SPEC-0002\nFeature: IntOnly\n# QFAI-CONTRACT-REF: none\n  @SC-0002-0001 @BR-0002-0001\n  Scenario: E2E\n    Given ...\n",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |",
          "| ----- | ----- | ------- | ------ | ----- | -------- | ----- |",
          "| TC-0001 | integration | AC-0001 | EX-0001 | step | expected | |",
          "| TC-0002 | e2e | AC-0002 | EX-0002 | step | expected | |",
        ].join("\n"),
      );

      const data = await createReportData(root);
      const markdown = formatReportMarkdown(data);

      expect(markdown).toContain("## TDD Coverage");
      expect(markdown).toContain("### spec-0002");
      expect(markdown).toContain("coverage-target TCs: 0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// TDD-0022 (TC-0014-0018): Report audit findings grouped by dimension
// TDD-0023 (TC-0014-0019): Report slop findings grouped by category
// TDD-0024 (TC-0014-0020): Report zero findings section omitted
// ---------------------------------------------------------------------------

describe("report design audit / slop sections", () => {
  function makeReportData(issues: Issue[]): ReportData {
    return {
      tool: "qfai",
      version: "0.0.0-test",
      generatedAt: "2024-01-01T00:00:00.000Z",
      root: "/test",
      configPath: "/test/qfai.config.yaml",
      summary: {
        specs: 0,
        scenarios: 0,
        contracts: { api: 0, ui: 0, db: 0, thema: 0 },
        counts: { info: 0, warning: 0, error: 0 },
      },
      ids: { spec: [], br: [], sc: [], ac: [], case: [], ui: [], api: [], db: [], thema: [] },
      traceability: {
        upstreamIdsFound: 0,
        referencedInCodeOrTests: false,
        sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
        scSources: {},
        testFiles: {
          globs: [],
          excludeGlobs: [],
          matchedFileCount: 0,
          truncated: false,
          limit: 20000,
        },
        contracts: { total: 0, referenced: 0, orphan: 0, idToSpecs: {} },
        specs: { contractRefMissing: 0, missingRefSpecs: [], specToContracts: {} },
      },
      testStrategy: {
        totalScenarios: 0,
        limit: 20,
        layer: { unit: 0, component: 0, integration: 0, api: 0, e2e: 0, none: 0, unknown: 0 },
        size: { s: 0, m: 0, l: 0, none: 0, unknown: 0 },
        missing: {
          layer: { total: 0, samples: [], truncated: false },
          size: { total: 0, samples: [], truncated: false },
        },
        e2e: {
          count: 0,
          ratio: 0,
          maxRatio: null,
          maxCount: null,
          ratioExceeded: false,
          countExceeded: false,
        },
      },
      tddCoverage: { specs: [] },
      guardrails: {
        total: 0,
        max: 20,
        truncated: false,
        byType: { nonGoal: 0, notNow: 0, tradeOff: 0 },
        items: [],
        scanErrors: [],
      },
      changeType: {
        summary: {
          totalEntries: 0,
          primary: { Initial: 0, Behavior: 0, Structural: 0, Ops: 0, unknown: 0 },
          tags: { "@api": 0, "@db": 0, "@nfr": 0, "@docs": 0, "@test": 0 },
          compat: {
            Compatibility: 0,
            Improvement: 0,
            Change: 0,
            "Bug-for-bug": 0,
            unknown: 0,
          },
        },
        ctypeWarnings: [],
        compatFindings: [],
        scopeMismatches: [],
        verificationFindings: [],
        deltaCoverage: { missingUpdateIssues: 0, status: "ok" },
      },
      waivers: {
        active: [],
        suppressed: { total: 0, byWaiver: {}, byRule: {} },
        expired: [],
      },
      issues,
    };
  }

  it("TDD-0022: groups audit findings under Design Audit Findings by dimension", () => {
    const issues: Issue[] = [
      {
        code: "QFAI-AUD-001",
        severity: "error",
        category: "canonical",
        message: "No primary task",
        rule: "audit.visualHierarchy",
      },
      {
        code: "QFAI-AUD-004",
        severity: "warning",
        category: "canonical",
        message: "Token drift",
        rule: "audit.tokenDiscipline",
      },
    ];
    const data = makeReportData(issues);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## Design Audit Findings");
    expect(markdown).toContain("### visualHierarchy");
    expect(markdown).toContain("### tokenDiscipline");
    expect(markdown).toContain("QFAI-AUD-001");
    expect(markdown).toContain("QFAI-AUD-004");
  });

  it("TDD-0023: groups slop findings under Slop Guardrails Findings by category", () => {
    const issues: Issue[] = [
      {
        code: "SLP-01",
        severity: "info",
        category: "canonical",
        message: "Generic shell detected",
        rule: "slop.generic-shell",
      },
      {
        code: "SLP-03",
        severity: "warning",
        category: "canonical",
        message: "Dark pattern detected",
        rule: "slop.dark-pattern",
      },
    ];
    const data = makeReportData(issues);
    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("## Slop Guardrails Findings");
    expect(markdown).toContain("### generic-shell");
    expect(markdown).toContain("### dark-pattern");
    expect(markdown).toContain("SLP-01");
    expect(markdown).toContain("SLP-03");
  });

  it("TDD-0024: omits audit/slop sections when no matching issues", () => {
    const issues: Issue[] = [
      {
        code: "QFAI-COMPAT-001",
        severity: "warning",
        category: "canonical",
        message: "Unrelated issue",
      },
    ];
    const data = makeReportData(issues);
    const markdown = formatReportMarkdown(data);

    expect(markdown).not.toContain("## Design Audit Findings");
    expect(markdown).not.toContain("## Slop Guardrails Findings");
  });
});

async function writeSpecPack(
  specsRoot: string,
  dirName: string,
  specId: string,
  contractRef?: string,
): Promise<void> {
  const packDir = path.join(specsRoot, dirName);
  await mkdir(packDir, { recursive: true });

  const specLines = [`# ${specId}: Sample`];
  if (contractRef !== undefined) {
    specLines.push(`QFAI-CONTRACT-REF: ${contractRef}`);
  }
  specLines.push("", "## 業務ルール", "", "- [BR-0001-0001][P1] sample");

  await writeFile(path.join(packDir, "01_Spec.md"), specLines.join("\n"));
  await writeFile(
    path.join(packDir, "18_delta.md"),
    [`# ${specId}: Delta`, "", "- 区分: Compatibility", ""].join("\n"),
  );
  const scenarioContractRef = contractRef ?? "none";
  await writeFile(
    path.join(packDir, "09_Examples.feature"),
    [
      `@${specId}`,
      "Feature: Sample",
      `# QFAI-CONTRACT-REF: ${scenarioContractRef}`,
      "  @SC-0001-0001 @BR-0001-0001",
      "  Scenario: Basic",
      "    Given ...",
      "",
    ].join("\n"),
  );
}

function extractSection(markdown: string, heading: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const startIndex = lines.findIndex((line) => line === heading);
  if (startIndex === -1) {
    return "";
  }
  const startLine = lines[startIndex] ?? "";
  const startLevel = startLine.startsWith("### ") ? 3 : 2;
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (startLevel === 2) {
      if (line.startsWith("## ")) {
        endIndex = i;
        break;
      }
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join("\n");
}

function createReportDataForLinks(): ReportData {
  return {
    tool: "qfai",
    version: "test",
    generatedAt: "2024-01-01T00:00:00.000Z",
    root: ".",
    configPath: "qfai.config.yaml",
    summary: {
      specs: 0,
      scenarios: 0,
      contracts: { api: 0, ui: 0, db: 0, thema: 0 },
      counts: { info: 0, warning: 1, error: 0 },
    },
    ids: {
      spec: [],
      br: [],
      sc: [],
      ac: [],
      case: [],
      ui: [],
      api: [],
      db: [],
      thema: [],
    },
    traceability: {
      upstreamIdsFound: 0,
      referencedInCodeOrTests: false,
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      scSources: {},
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: 20000,
      },
      contracts: { total: 0, referenced: 0, orphan: 0, idToSpecs: {} },
      specs: {
        contractRefMissing: 0,
        missingRefSpecs: [],
        specToContracts: {},
      },
    },
    testStrategy: {
      totalScenarios: 0,
      limit: 20,
      layer: {
        unit: 0,
        component: 0,
        integration: 0,
        api: 0,
        e2e: 0,
        none: 0,
        unknown: 0,
      },
      size: {
        s: 0,
        m: 0,
        l: 0,
        none: 0,
        unknown: 0,
      },
      missing: {
        layer: { total: 0, samples: [], truncated: false },
        size: { total: 0, samples: [], truncated: false },
      },
      e2e: {
        count: 0,
        ratio: 0,
        maxRatio: null,
        maxCount: null,
        ratioExceeded: false,
        countExceeded: false,
      },
    },
    guardrails: {
      total: 0,
      max: 20,
      truncated: false,
      byType: { nonGoal: 0, notNow: 0, tradeOff: 0 },
      items: [],
      scanErrors: [],
    },
    changeType: {
      summary: {
        totalEntries: 0,
        primary: {
          Initial: 0,
          Behavior: 0,
          Structural: 0,
          Ops: 0,
          unknown: 0,
        },
        tags: {
          "@api": 0,
          "@db": 0,
          "@nfr": 0,
          "@docs": 0,
          "@test": 0,
        },
        compat: {
          Compatibility: 0,
          Improvement: 0,
          Change: 0,
          "Bug-for-bug": 0,
          unknown: 0,
        },
      },
      ctypeWarnings: [],
      compatFindings: [],
      scopeMismatches: [],
      verificationFindings: [],
      deltaCoverage: {
        missingUpdateIssues: 0,
        status: "ok",
      },
    },
    waivers: {
      active: [],
      suppressed: {
        total: 0,
        byWaiver: {},
        byRule: {},
      },
      expired: [],
    },
    tddCoverage: { specs: [] },
    issues: [
      {
        code: "QFAI-TEST-000",
        severity: "warning",
        category: "canonical",
        message: "link test",
        file: "specs/with space/テスト.md",
        loc: { line: 12 },
      },
    ],
  };
}

describe("report prototyping markdown", () => {
  function buildPrototypingSummary(
    overrides: Partial<NonNullable<ReportData["prototyping"]>> = {},
  ): NonNullable<ReportData["prototyping"]> {
    return {
      roundLifecycle: {
        schemaVersion: "2.0",
        rounds: 2,
        roundIds: ["r5", "r3"],
        candidatesObserved: 8,
        perfectRounds: 1,
        harvestArtifacts: 2,
        narrowDecisions: 2,
        absorptionPlans: 1,
        reimplementations: 1,
        polishCycles: 2,
        completedPolishCycles: 1,
        perfectPolishCycles: 1,
        polishKinds: { polish: 1, completed: 1 },
      },
      mode: {
        requested: "full-harness",
        effective: "full-harness",
        source: "explicit-request",
        rationale: "runtime proof requested",
        surface: "web",
      },
      evidence: {
        specsCoverageStatus: "complete",
        specsCoverage: {
          expectedSpecIds: ["spec-0001", "spec-0002"],
          observedSpecIds: ["spec-0001"],
          missingSpecIds: ["spec-0002"],
          unexpectedSpecIds: ["spec-9999"],
        },
        runtimeGate: { present: true, required: true },
        uiFidelity: { present: true, required: true },
        renderBundle: { present: true, required: true },
        browserQaBundle: { present: true, required: true },
        obligationProfile: "web/full-harness",
      },
      fullHarness: {
        enabled: true,
        runId: "fh-1",
        status: "completed",
        iterationCount: 2,
        bestIteration: 2,
        terminationReason: "converged",
        reviewerId: "reviewer-1",
        reviewerSignoffStatus: "approved",
        calibrationRef: {
          configPath: ".qfai/prototyping/calibration/config.yaml",
          packPath: ".qfai/prototyping/calibration/pack.yaml",
          packVersion: "1.0.0",
        },
        latestScoredIteration: 2,
        scoringTraceCount: 3,
        reviewerLogsCount: 1,
        limitations: ["manual review required"],
      },
      render: {
        status: "captured",
        requested: true,
        captured: 2,
        skipped: 1,
        failed: 0,
        malformed: false,
        inlinePayloadViolation: true,
      },
      browserQa: {
        status: "completed",
        executed: true,
        findingsBySeverity: { error: 1, warning: 2, info: 3 },
        findingsByCategory: { accessibility: 2, visual: 1 },
        summaryAggregates: { totalPassed: 10, totalFailed: 2 },
        phaseSummary: {
          smoke: { status: "completed", findingsCount: 1, checksCount: 4, passed: 3, failed: 1 },
        },
        modeMismatch: true,
      },
      calibration: {
        configPresent: true,
        thresholdSummary: { accept: 0.9, refine: 0.75 },
        scoringTraceAvailable: true,
        belowThresholdWarning: true,
      },
      warnings: ["late review risk remains"],
      ...overrides,
    };
  }

  it("renders the current prototyping sections and omits legacy artifact-first fields", () => {
    const data = createReportDataForLinks();
    data.prototyping = buildPrototypingSummary();

    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("### prototyping.mode");
    expect(markdown).toContain("- requested: full-harness");
    expect(markdown).toContain("- effective: full-harness");
    expect(markdown).toContain("### prototyping.roundLifecycle");
    expect(markdown).toContain("- candidates observed: 8");
    expect(markdown).toContain("### prototyping.evidence");
    expect(markdown).toContain("- specs expected: 2");
    expect(markdown).toContain("- specs missing: spec-0002");
    expect(markdown).toContain("- specs unexpected: spec-9999");
    expect(markdown).toContain("### prototyping.fullHarness");
    expect(markdown).toContain("- reviewerSignoff.status: approved");
    expect(markdown).toContain("- calibrationRef.packVersion: 1.0.0");
    expect(markdown).toContain("### prototyping.render");
    expect(markdown).toContain("- inline payload violation: true");
    expect(markdown).toContain("### prototyping.browserQa");
    expect(markdown).toContain("- findings by category: accessibility=2, visual=1");
    expect(markdown).toContain("- summary aggregates: passed=10 failed=2");
    expect(markdown).toContain("### prototyping.calibration");
    expect(markdown).toContain("- thresholds: accept=0.9 refine=0.75");
    expect(markdown).toContain("### prototyping.observability");
    expect(markdown).toContain("### prototyping.warnings");
    expect(markdown).not.toContain("### prototyping.recommendationArtifact");
    expect(markdown).not.toContain("discussion recommendation");
    expect(markdown).not.toContain("allowed_modes");
    expect(markdown).not.toContain("source schema");
  });

  it("omits optional prototyping subsections when data is absent", () => {
    const data = createReportDataForLinks();
    data.prototyping = buildPrototypingSummary({
      fullHarness: undefined,
      roundLifecycle: undefined,
      render: undefined,
      browserQa: undefined,
      calibration: undefined,
      warnings: [],
      evidence: {
        specsCoverageStatus: "complete",
        runtimeGate: { present: true, required: true },
        uiFidelity: { present: true, required: true },
        renderBundle: { present: false, required: true },
        browserQaBundle: { present: false, required: true },
        obligationProfile: "web/full-harness",
      },
    });

    const markdown = formatReportMarkdown(data);

    expect(markdown).toContain("### prototyping.mode");
    expect(markdown).toContain("### prototyping.evidence");
    expect(markdown).toContain("### prototyping.observability");
    expect(markdown).not.toContain("### prototyping.roundLifecycle");
    expect(markdown).not.toContain("### prototyping.fullHarness");
    expect(markdown).not.toContain("### prototyping.render");
    expect(markdown).not.toContain("### prototyping.browserQa");
    expect(markdown).not.toContain("### prototyping.calibration");
    expect(markdown).not.toContain("### prototyping.warnings");
  });
});
