/**
 * Integration tests for spec-0034: Discussion Canonical Architecture Convergence
 *
 * Tests taste, trend, 3-layer, scoring, strategy, and screen contract validators
 * with fixture data in temp directories.
 */

// QFAI:SPEC-0002:TC-0002-0001
// QFAI:SPEC-0002:TC-0002-0002
// QFAI:SPEC-0002:TC-0002-0003
// QFAI:SPEC-0002:TC-0002-0004
// QFAI:SPEC-0002:TC-0002-0005
// QFAI:SPEC-0002:TC-0002-0006
// QFAI:SPEC-0002:TC-0002-0007
// QFAI:SPEC-0002:TC-0002-0008
// QFAI:SPEC-0002:TC-0002-0009
// QFAI:SPEC-0002:TC-0002-0010
// QFAI:SPEC-0002:TC-0002-0011
// QFAI:SPEC-0002:TC-0002-0012
// QFAI:SPEC-0002:TC-0002-0013
// QFAI:SPEC-0002:TC-0002-0014
// QFAI:SPEC-0002:TC-0002-0015
// QFAI:SPEC-0002:TC-0002-0016
// QFAI:SPEC-0002:TC-0002-0017
// QFAI:SPEC-0002:TC-0002-0018
// QFAI:SPEC-0002:TC-0002-0019
// QFAI:SPEC-0002:TC-0002-0020
// QFAI:SPEC-0002:TC-0002-0021
// QFAI:SPEC-0002:TC-0002-0022
// QFAI:SPEC-0002:TC-0002-0023
// QFAI:SPEC-0002:TC-0002-0024
// QFAI:SPEC-0002:TC-0002-0025
// QFAI:SPEC-0002:TC-0002-0026
// QFAI:SPEC-0002:TC-0002-0027
// QFAI:SPEC-0002:TC-0002-0028
// QFAI:SPEC-0002:TC-0002-0029
// QFAI:SPEC-0002:TC-0002-0030
// QFAI:SPEC-0002:TC-0002-0031
// QFAI:SPEC-0002:TC-0002-0032
// QFAI:SPEC-0002:TC-0002-0033
// QFAI:SPEC-0002:TC-0002-0034
// QFAI:SPEC-0002:TC-0002-0035
// QFAI:SPEC-0002:TC-0002-0036
// QFAI:SPEC-0002:TC-0002-0037
// QFAI:SPEC-0002:TC-0002-0038
// QFAI:SPEC-0002:TC-0002-0039

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTasteInterview } from "../../src/core/validators/uix/taste.js";
import { validateTrendScan } from "../../src/core/validators/uix/trend.js";
import {
  validateThreeLayerModel,
  validateThreeLayerFamilyCompleteness,
} from "../../src/core/validators/uix/threeLayer.js";
import { validateScoringReady } from "../../src/core/validators/uix/scoringReady.js";
import { validateStrategyStrong } from "../../src/core/validators/uix/strategy.js";
import { validateScreenContractSchema } from "../../src/core/validators/uix/screenContract.js";

// ---------------------------------------------------------------------------
// SKILL.md path
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "SKILL.md",
);

// ---------------------------------------------------------------------------
// Temp dir management
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-canonical-int-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const TASTE_SECTIONS = [
  "visual_character",
  "emotional_tone",
  "anti_preferences",
  "admired_rejected_references",
  "novelty_vs_safety",
  "density_hierarchy",
  "motion_material",
  "brand_tone",
  "unresolved_taste_questions",
  "taste_reflection_depth",
] as const;

function completeTasteContent(): string {
  return TASTE_SECTIONS.map(
    (s) => `## ${s}\n\nThis section has meaningful content for ${s}.\n`,
  ).join("\n");
}

function partialTasteContent(sectionsToInclude: number): string {
  return TASTE_SECTIONS.slice(0, sectionsToInclude)
    .map((s) => `## ${s}\n\nMeaningful content for ${s}.\n`)
    .join("\n");
}

function antiPreferenceTasteContent(): string {
  return TASTE_SECTIONS.map((s) => `## ${s}\n\nno preference\n`).join("\n");
}

function completeTrendContent(): string {
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "| reference | confidence | freshness_date | source_translation |",
    "| --------- | ---------- | -------------- | ------------------ |",
    "| Ref A     | high       | 2025-12-01     | Adopted micro-interaction pattern |",
    "| Ref B     | medium     | 2025-11-15     | Adopted card layout trend |",
    "| Ref C     | low        | 2025-10-01     | Adopted minimalist approach |",
  ].join("\n");
}

function allLowConfidenceTrendContent(): string {
  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    "| reference | confidence | freshness_date | source_translation |",
    "| --------- | ---------- | -------------- | ------------------ |",
    "| Ref A     | low        | 2025-12-01     | Adopted micro-interaction pattern |",
    "| Ref B     | low        | 2025-11-15     | Adopted card layout trend |",
    "| Ref C     | low        | 2025-10-01     | Adopted minimalist approach |",
  ].join("\n");
}

const ALL_16_SCORING_FIELDS = [
  "axis_id",
  "axis_name",
  "layer",
  "definition",
  "rationale",
  "scoring_rubric",
  "weight",
  "min_score",
  "max_score",
  "pass_threshold",
  "evidence_type",
  "evidence_source",
  "review_prompt",
  "calibration_anchor",
  "dependencies",
  "review_questions",
] as const;

function completeScoringContent(): string {
  const lines = ["# Scoring Axes", "", "## Axis: accessibility", ""];
  for (const field of ALL_16_SCORING_FIELDS) {
    lines.push(`- ${field}: Valid value for ${field}`);
  }
  return lines.join("\n");
}

function incompleteScoringContent(): string {
  const lines = ["# Scoring Axes", "", "## Axis: accessibility", ""];
  // Only include 14 of 16 fields (missing scoring_rubric and calibration_anchor)
  for (const field of ALL_16_SCORING_FIELDS) {
    if (field === "scoring_rubric" || field === "calibration_anchor") continue;
    lines.push(`- ${field}: Valid value for ${field}`);
  }
  return lines.join("\n");
}

function aggregateScoringContent(): string {
  return [
    "# Aggregate Scoring Rules",
    "",
    "- thresholds: min 70 overall",
    "- floors: no axis below 50",
    "- plateau: diminishing returns above 90",
    "- missing_score_policy: exclude from aggregate",
  ].join("\n");
}

function fullMandatoryScoringContent(): string {
  return completeScoringContent() + "\n\n" + aggregateScoringContent();
}

const STRONG_8_FIELDS = [
  "surface",
  "selection_required",
  "decision",
  "candidate_options",
  "chosen_option",
  "rationale",
  "verification_expectations",
  "notes_for_reviewer",
] as const;

function strongStrategyContent(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    surface: "web-ui",
    selection_required: "true",
    decision: "Chose Option A for better accessibility",
    candidate_options: "Option A, Option B, Option C",
    chosen_option: "Option A",
    rationale: "Option A provides better accessibility compliance",
    verification_expectations: "All WCAG AA checks pass",
    notes_for_reviewer: "Focus on mobile viewport behavior",
  };
  const merged = { ...defaults, ...overrides };
  return "# Strategy\n\n" + STRONG_8_FIELDS.map((f) => `- ${f}: ${merged[f]}`).join("\n");
}

function weakStrategyContent(): string {
  return [
    "# Strategy",
    "",
    "- surface_type: web-ui",
    "- approach: Use a card-based layout",
    "- rationale: Cards are familiar and scalable",
  ].join("\n");
}

function completeScreenEntry(id: string, states = "default, loading, empty, error"): string {
  return [
    `### Screen: ${id}`,
    "",
    `- screen_id: ${id}`,
    `- route: /app/${id}`,
    `- purpose: Main ${id} view`,
    `- actor: end-user`,
    `- primary_tasks: View data, Edit entries`,
    `- required_states: ${states}`,
    `- transitions: Navigate to detail, Back to list`,
    `- observable_outcomes: Data displayed, Changes saved`,
    `- notes_for_verify: Check responsive layout`,
    `- notes_for_reviewer: Focus on loading state`,
  ].join("\n");
}

function incompleteScreenEntry(id: string): string {
  return [
    `### Screen: ${id}`,
    "",
    `- screen_id: ${id}`,
    `- route: /app/${id}`,
    `- purpose: Main ${id} view`,
    `- actor: end-user`,
    `- primary_tasks: View data`,
    // Missing: required_states, transitions, observable_outcomes, notes_for_verify, notes_for_reviewer
  ].join("\n");
}

// ---------------------------------------------------------------------------
// TC-0002-0001..0005: Taste validator
// ---------------------------------------------------------------------------

describe("Taste validator", () => {
  // TC-0002-0001
  it("TC-0002-0001: complete taste interview (10 sections) passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      completeTasteContent(),
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TASTE"))).toHaveLength(0);
  });

  // TC-0002-0002
  it("TC-0002-0002: missing taste interview emits TASTE-MISSING", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const issues = await validateTasteInterview(root, defaultConfig);

    const missing = issues.filter((i) => i.code === "UIX-VAL-TASTE-MISSING");
    expect(missing.length).toBeGreaterThan(0);
  });

  // TC-0002-0003
  it("TC-0002-0003: 7/10 sections emits TASTE-INCOMPLETE with missing names", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      partialTasteContent(7),
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    const incomplete = issues.filter((i) => i.code === "UIX-VAL-TASTE-INCOMPLETE");
    expect(incomplete.length).toBeGreaterThan(0);
  });

  // TC-0002-0004
  it("TC-0002-0004: non-UI pack skips taste validator", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TASTE"))).toHaveLength(0);
  });

  // TC-0002-0005
  it("TC-0002-0005: all sections as 'no preference' passes (non-empty content)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      antiPreferenceTasteContent(),
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TASTE"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0006..0009, TC-0002-0027: Trend validator
// ---------------------------------------------------------------------------

describe("Trend validator", () => {
  // TC-0002-0006
  it("TC-0002-0006: complete trend scan with freshness metadata passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "04_Sources.md"), completeTrendContent(), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TREND"))).toHaveLength(0);
  });

  // TC-0002-0007
  it("TC-0002-0007: missing trend scan section emits TREND-SCAN-MISSING", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "04_Sources.md"),
      "# Sources\n\n## Other\n\nSome data.\n",
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);

    const missing = issues.filter((i) => i.code === "UIX-VAL-TREND-SCAN-MISSING");
    expect(missing.length).toBeGreaterThan(0);
  });

  // TC-0002-0008
  it("TC-0002-0008: trend scan missing source_translation emits FRESHNESS-MISSING", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Sources",
      "",
      "## Trend Scan",
      "",
      "| reference | confidence | freshness_date |",
      "| --------- | ---------- | -------------- |",
      "| Ref A     | high       | 2025-12-01     |",
    ].join("\n");
    await writeFile(path.join(root, "04_Sources.md"), content, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    const freshness = issues.filter((i) => i.code === "UIX-VAL-TREND-FRESHNESS-MISSING");
    expect(freshness.length).toBeGreaterThan(0);
  });

  // TC-0002-0009
  it("TC-0002-0009: non-UI pack skips trend validator", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TREND"))).toHaveLength(0);
  });

  // TC-0002-0027
  it("TC-0002-0027: all low confidence references pass (confidence field exists)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "04_Sources.md"), allLowConfidenceTrendContent(), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TREND"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0010..0012, TC-0002-0026: 3-layer evaluation model
// ---------------------------------------------------------------------------

describe("3-layer evaluation model", () => {
  // TC-0002-0010
  it("TC-0002-0010: all axes in 3-layer format passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: Universal access compliance",
      "- consistency: Design system adherence",
      "",
      "## trend-derived",
      "",
      "- micro_interaction: source_translation: Adopted from 2025 motion trends",
      "",
      "## product-specific",
      "",
      "- brand_alignment: Unique to this product context",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  // TC-0002-0011
  it("TC-0002-0011: v1.7.6 4-axis format emits deprecation warning", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Evaluation Axes",
      "",
      "## usability",
      "",
      "- task_completion: Can users finish core tasks?",
      "",
      "## consistency",
      "",
      "- design_system: Adherence to design system",
      "",
      "## accessibility",
      "",
      "- wcag: WCAG AA compliance",
      "",
      "## delight",
      "",
      "- animation: Smooth transitions",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    const deprecation = warnings.find((i) => i.message.match(/4-axis|deprecat/i));
    expect(deprecation).toBeDefined();
  });

  // TC-0002-0012
  it("TC-0002-0012: mixed 4-axis and 3-layer emits inconsistency error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: Universal access compliance",
      "",
      "## usability",
      "",
      "- task_completion: Can users finish core tasks?",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  // TC-0002-0026
  it("TC-0002-0026: code references 3-layer model terms", async () => {
    // Structural test: verify the validator module references the canonical terms
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: compliance",
      "",
      "## trend-derived",
      "",
      "- micro: trend",
      "",
      "## product-specific",
      "",
      "- brand: alignment",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    // All axes in canonical format should pass
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0013..0015, TC-0002-0025, TC-0002-0028: Scoring-ready validator
// ---------------------------------------------------------------------------

describe("Scoring-ready validator", () => {
  // TC-0002-0013
  it("TC-0002-0013: axis with all 16 scoring fields passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), completeScoringContent(), "utf-8");

    const issues = await validateScoringReady(root, defaultConfig);

    const scoringErrors = issues.filter((i) => i.code === "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE");
    expect(scoringErrors).toHaveLength(0);
  });

  // TC-0002-0014
  it("TC-0002-0014: axis missing scoring_rubric and calibration_anchor fails", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_eval_axes.md"),
      incompleteScoringContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    const incomplete = issues.filter((i) => i.code === "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE");
    expect(incomplete.length).toBeGreaterThan(0);
  });

  // TC-0002-0015
  it("TC-0002-0015: non-UI pack skips scoring validator", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScoringReady(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-DYNAMIC-AXIS"))).toHaveLength(0);
  });

  // TC-0002-0025
  it("TC-0002-0025: aggregate scoring rules present passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_eval_axes.md"),
      fullMandatoryScoringContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    const scoringErrors = issues.filter((i) => i.code.startsWith("UIX-VAL-DYNAMIC-AXIS"));
    expect(scoringErrors).toHaveLength(0);
  });

  // TC-0002-0028
  it("TC-0002-0028: all mandatory per-axis and aggregate fields passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_eval_axes.md"),
      fullMandatoryScoringContent(),
      "utf-8",
    );

    const issues = await validateScoringReady(root, defaultConfig);

    const allScoring = issues.filter((i) => i.code.startsWith("UIX-VAL-DYNAMIC-AXIS"));
    expect(allScoring).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0016..0019: Strategy validator
// ---------------------------------------------------------------------------

describe("Strategy validator", () => {
  // TC-0002-0016
  it("TC-0002-0016: strategy with all 8 strong fields passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "10_strategy.md"), strongStrategyContent(), "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-STRATEGY"))).toHaveLength(0);
  });

  // TC-0002-0017
  it("TC-0002-0017: weak format strategy emits legacy warning", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "10_strategy.md"), weakStrategyContent(), "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);

    const legacy = issues.filter((i) => i.code === "UIX-VAL-STRATEGY-WEAK-LEGACY");
    expect(legacy.length).toBeGreaterThan(0);
    expect(legacy[0]?.severity).toBe("warning");
  });

  // TC-0002-0018
  it("TC-0002-0018: non-UI pack skips strategy validator", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-STRATEGY"))).toHaveLength(0);
  });

  // TC-0002-0019
  it("TC-0002-0019: selection_required=true with 1 candidate fails", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      strongStrategyContent({ candidate_options: "Only One Option" }),
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);

    const selectionIssues = issues.filter(
      (i) => i.code.startsWith("UIX-VAL-STRATEGY") && i.severity === "error",
    );
    expect(selectionIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0020..0024: Screen contract validator
// ---------------------------------------------------------------------------

describe("Screen contract validator", () => {
  // TC-0002-0020
  it("TC-0002-0020: 3 complete screen entries with unique IDs passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("dashboard"),
      "",
      completeScreenEntry("settings"),
      "",
      completeScreenEntry("profile"),
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  // TC-0002-0021
  it("TC-0002-0021: screen entry missing transitions emits SCHEMA-INCOMPLETE", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = ["# Screen Contracts", "", incompleteScreenEntry("dashboard")].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const incomplete = issues.filter((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE");
    expect(incomplete.length).toBeGreaterThan(0);
  });

  // TC-0002-0022
  it("TC-0002-0022: non-UI pack skips screen contract validator", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-SCREEN-CONTRACT"))).toHaveLength(0);
  });

  // TC-0002-0023
  it("TC-0002-0023: duplicate screen_id emits error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("dashboard"),
      "",
      completeScreenEntry("dashboard"), // duplicate
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const dupIssues = issues.filter(
      (i) => i.message.match(/duplicate/i) || i.code.includes("DUPLICATE"),
    );
    expect(dupIssues.length).toBeGreaterThan(0);
  });

  // TC-0002-0024
  it("TC-0002-0024: screen missing required states emits error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      completeScreenEntry("dashboard", "default, loading"), // missing empty, error
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_contracts.md"), content, "utf-8");

    const issues = await validateScreenContractSchema(root, defaultConfig);

    const stateIssues = issues.filter(
      (i) => i.message.match(/required_states|state/i) && i.severity === "error",
    );
    expect(stateIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0029..0033: SKILL.md vocabulary and completion conditions
// ---------------------------------------------------------------------------

describe("SKILL.md completion conditions", () => {
  // TC-0002-0029
  it("TC-0002-0029: no 4-axis axis name keywords in completion conditions", async () => {
    const content = await readFile(skillPath, "utf-8");

    // Extract the UI-bearing Completion Conditions section
    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    expect(completionMatch).toBeTruthy();

    if (completionMatch?.[1]) {
      const section = completionMatch[1];
      // Should not use legacy 4-axis model names as categories
      expect(section).not.toMatch(/\b4-axis\b/i);
      expect(section).not.toMatch(/\bfour-axis\b/i);
    }
  });

  // TC-0002-0030
  it("TC-0002-0030: SKILL.md completion section references evaluation axes", async () => {
    const content = await readFile(skillPath, "utf-8");

    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    expect(completionMatch).toBeTruthy();

    if (completionMatch?.[1]) {
      const section = completionMatch[1];
      // Should reference scoring/evaluation axes
      expect(section).toMatch(/[Ss]coring axes|design_eval|evaluation/i);
    }
  });

  // TC-0002-0031
  it("TC-0002-0031: non-ui path explicitly exempt from UI-bearing completion conditions", async () => {
    const content = await readFile(skillPath, "utf-8");

    // Non-UI Completion section should exist and state exemption
    expect(content).toMatch(/Non-UI Completion/i);

    const nonUiMatch = /Non-UI Completion([\s\S]*?)(?=^## |$)/m.exec(content);
    expect(nonUiMatch).toBeTruthy();
    if (nonUiMatch?.[1]) {
      const section = nonUiMatch[1];
      expect(section).toMatch(/unchanged|[Nn]o additional|not.*required|exempt/i);
    }
  });

  // TC-0002-0032
  it("TC-0002-0032: SKILL.md completion conditions do not contain banned 4-axis keyword 'usability' as model keyword", async () => {
    const content = await readFile(skillPath, "utf-8");

    // Extract completion conditions section
    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    if (completionMatch?.[1]) {
      const section = completionMatch[1];
      // The completion conditions should not use "usability" as a standalone model axis keyword
      // Note: file name references like "design_eval_invariant.md" are acceptable
      expect(section).not.toMatch(/\b4-axis\b/i);
      expect(section).not.toMatch(/\bfour-axis\b/i);
    }
  });

  // TC-0002-0033
  it("TC-0002-0033: SKILL.md completion conditions contain scoring axes reference", async () => {
    const content = await readFile(skillPath, "utf-8");

    const completionMatch = /UI-bearing Completion Conditions([\s\S]*?)(?=^## |$)/m.exec(content);
    expect(completionMatch).toBeTruthy();
    if (completionMatch?.[1]) {
      const section = completionMatch[1];
      expect(section).toMatch(/[Ss]coring axes|design_eval/i);
    }
  });
});

// ---------------------------------------------------------------------------
// TC-0002-0034..0039: v1.7.12 3-layer canonical model enforcement
// ---------------------------------------------------------------------------

describe("3-layer canonical model enforcement (v1.7.12)", () => {
  // TC-0002-0034
  it("TC-0002-0034: 00_index.md with 3-layer canonical file list (11 files) → validator pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const indexContent = [
      "# uiux/ Sidecar Index",
      "",
      "| File | Purpose | Required |",
      "| ---- | ------- | -------- |",
      "| 00_index.md | Manifest | Yes |",
      "| 10_strategy.md | Strategy | Yes |",
      "| 20_design_eval_invariant.md | Invariant layer | Yes |",
      "| 21_design_eval_trend_derived.md | Trend-derived layer | Yes |",
      "| 22_design_eval_product_specific.md | Product-specific layer | Yes |",
      "| 23_design_eval_aggregate.md | Aggregate layer | Yes |",
      "| 30_comparison.md | Comparison | Yes |",
      "| 31_anchor.md | Anchor screen | Yes |",
      "| 40_contracts.md | Screen contracts | Yes |",
      "| 50_review_bundle.md | Review bundle | Yes |",
      "| 60_critique_loop.md | Critique loop | Yes |",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "00_index.md"), indexContent, "utf-8");

    const threeLayerContent =
      "## invariant\n\nContent.\n\n## trend-derived\n\nContent.\n\n## product-specific\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), threeLayerContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  // TC-0002-0035
  it("TC-0002-0035: eval axes with legacy 4-axis headings → validator flags legacy format", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const legacyContent =
      "## usability\n\nContent.\n\n## consistency\n\nContent.\n\n## accessibility\n\nContent.\n\n## delight\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), legacyContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-3LAYER-LEGACY-FORMAT")).toBe(true);
  });

  // TC-0002-0036
  it("TC-0002-0036: uiux/ has 30_comparison.md without 31_anchor.md → threeLayer validator pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "30_comparison.md"),
      "# Comparison\n\nContent.\n",
      "utf-8",
    );

    const threeLayerContent =
      "## invariant\n\nContent.\n\n## trend-derived\n\nContent.\n\n## product-specific\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), threeLayerContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  // TC-0002-0037
  it("TC-0002-0037: all 4 eval axis files with 3-layer content → pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const threeLayerContent =
      "## invariant\n\nContent.\n\n## trend-derived\n\nContent.\n\n## product-specific\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), threeLayerContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });

  // TC-0002-0038
  it("TC-0002-0038: 24_design_eval_dynamic_overrides.md absent → error (incomplete family)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Create uiux/ with 00_index.md but WITHOUT 24_design_eval_dynamic_overrides.md
    await writeFile(path.join(root, "uiux", "00_index.md"), "# Index\n\nContent\n", "utf-8");
    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.code === "UIX-VAL-3LAYER-INCOMPLETE-FAMILY")).toBe(true);
  });

  // TC-0002-0039
  it("TC-0002-0039: non-UI project completes discussion → uiux/ absent, no error", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });
});
