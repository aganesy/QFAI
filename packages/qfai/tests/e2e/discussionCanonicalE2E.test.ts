/**
 * E2E tests for spec-0034: Discussion Canonical Architecture Convergence
 *
 * Verifies high-level behavior of canonical architecture validators
 * (taste, trend, 3-layer, scoring, strategy, screen contract),
 * SKILL.md content, and non-UI exemptions.
 */

// QFAI:SPEC-0002:US-0002-0001
// QFAI:SPEC-0002:US-0002-0002
// QFAI:SPEC-0002:US-0002-0003
// QFAI:SPEC-0002:US-0002-0004
// QFAI:SPEC-0002:US-0002-0005
// QFAI:SPEC-0002:US-0002-0006
// QFAI:SPEC-0002:US-0002-0007
// QFAI:SPEC-0002:US-0002-0008
// QFAI:SPEC-0002:US-0002-0011
// QFAI:SPEC-0002:US-0002-0012
// QFAI:SPEC-0010:US-0010-0009
// QFAI:SPEC-0010:US-0010-0010
// QFAI:SPEC-0010:US-0010-0011
// QFAI:SPEC-0010:US-0010-0012
// QFAI:SPEC-0010:US-0010-0013
// QFAI:SPEC-0010:US-0010-0014

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTasteInterview } from "../../src/core/validators/uix/taste.js";
import { validateTrendScan } from "../../src/core/validators/uix/trend.js";
import {
  validateThreeLayerModel,
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
} from "../../src/core/validators/uix/threeLayer.js";
import { validateScoringReady } from "../../src/core/validators/uix/scoringReady.js";
import { validateStrategyStrong } from "../../src/core/validators/uix/strategy.js";
import { validateScreenContractSchema } from "../../src/core/validators/uix/screenContract.js";

// ---------------------------------------------------------------------------
// Resolve SKILL.md
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

const templateDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "templates",
);

let skillContent: string | undefined;

async function loadSkill(): Promise<string> {
  skillContent ??= await readFile(skillPath, "utf-8");
  return skillContent;
}

// ---------------------------------------------------------------------------
// Temp dir management
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-canonical-e2e-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

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

function completeThreeLayerContent(): string {
  return [
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
  lines.push("");
  lines.push("# Aggregate Scoring Rules");
  lines.push("");
  lines.push("- thresholds: min 70 overall");
  lines.push("- floors: no axis below 50");
  lines.push("- plateau: diminishing returns above 90");
  lines.push("- missing_score_policy: exclude from aggregate");
  return lines.join("\n");
}

const STRONG_STRATEGY_FIELDS = [
  "surface",
  "selection_required",
  "decision",
  "candidate_options",
  "chosen_option",
  "rationale",
  "verification_expectations",
  "notes_for_reviewer",
] as const;

function completeStrategyContent(): string {
  const defaults: Record<string, string> = {
    surface: "web-ui",
    selection_required: "true",
    decision: "Chose Option A for better accessibility",
    candidate_options: "Option A, Option B, Option C",
    chosen_option: "Option A",
    rationale: "Option A provides better accessibility compliance",
    verification_expectations: "All WCAG AA checks pass in smoke testing",
    notes_for_reviewer: "Focus on mobile viewport behavior",
  };
  const lines = ["# Strategy", ""];
  for (const f of STRONG_STRATEGY_FIELDS) {
    lines.push(`- ${f}: ${defaults[f]}`);
  }
  return lines.join("\n");
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

// ---------------------------------------------------------------------------
// US-0002-0001: Design Taste Interview
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0001
describe("US-0002-0001: Design Taste Interview", () => {
  it("complete taste interview on UI-bearing pack produces no errors", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      completeTasteContent(),
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("non-UI pack skips taste validation entirely", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TASTE"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0002: Trend/Reference Research mandatory
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0002
describe("US-0002-0002: Trend/Reference Research mandatory", () => {
  it("complete trend scan with freshness metadata passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "04_Sources.md"), completeTrendContent(), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("non-UI pack skips trend validation", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-TREND"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0003: 3-Layer Evaluation Architecture convergence
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0003
describe("US-0002-0003: 3-Layer Evaluation Architecture convergence", () => {
  it("all axes in 3-layer format passes validation", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_eval_axes.md"),
      completeThreeLayerContent(),
      "utf-8",
    );

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0004: Scoring-Ready Schema
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0004
describe("US-0002-0004: Scoring-Ready Schema", () => {
  it("axis with all 16 scoring fields passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), completeScoringContent(), "utf-8");

    const issues = await validateScoringReady(root, defaultConfig);

    const scoringErrors = issues.filter((i) => i.code.startsWith("UIX-VAL-DYNAMIC-AXIS"));
    expect(scoringErrors).toHaveLength(0);
  });

  it("non-UI pack skips scoring validation", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScoringReady(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-DYNAMIC-AXIS"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0005: Strategy Artifact strong schema
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0005
describe("US-0002-0005: Strategy Artifact strong schema", () => {
  it("strategy with all 8 strong fields passes", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "10_strategy.md"), completeStrategyContent(), "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);

    const strategyErrors = issues.filter((i) => i.code.startsWith("UIX-VAL-STRATEGY"));
    expect(strategyErrors).toHaveLength(0);
  });

  it("non-UI pack skips strategy validation", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-STRATEGY"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0006: Screen Contract multi-screen schema
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0006
describe("US-0002-0006: Screen Contract multi-screen schema", () => {
  it("3 complete screen entries with unique IDs passes", async () => {
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

  it("non-UI pack skips screen contract validation", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateScreenContractSchema(root, defaultConfig);

    expect(issues.filter((i) => i.code.startsWith("UIX-VAL-SCREEN-CONTRACT"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0007: SKILL.md 4-axis completion condition removal
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0007
describe("US-0002-0007: SKILL.md 4-axis completion condition removal", () => {
  it("SKILL.md completion conditions reference scoring axes", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Scoring axes defined|scoring axes/i);
  });

  it("SKILL.md mentions evaluation layer files", async () => {
    const c = await loadSkill();
    // The SKILL.md should reference the design eval files
    expect(c).toMatch(/design_eval|scoring axes/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0008: Non-UI path completion condition exemption
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0008
describe("US-0002-0008: Non-UI path completion condition exemption", () => {
  it("SKILL.md documents non-ui completion exemption from UI-bearing conditions", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/[Nn]on-ui.*completion|[Nn]on-UI Completion/i);
    expect(c).toMatch(/[Nn]o additional UI\/UX conditions|unchanged from prior|[Nn]o.*sidecar/i);
  });

  it("non-UI packs produce zero issues across all UIX validators", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const [taste, trend, scoring, strategy, screen] = await Promise.all([
      validateTasteInterview(root, defaultConfig),
      validateTrendScan(root, defaultConfig),
      validateScoringReady(root, defaultConfig),
      validateStrategyStrong(root, defaultConfig),
      validateScreenContractSchema(root, defaultConfig),
    ]);

    const allIssues = [...taste, ...trend, ...scoring, ...strategy, ...screen];
    const uixIssues = allIssues.filter((i) => i.code.startsWith("UIX-VAL-"));
    expect(uixIssues).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// US-0002-0011: サイドカーテンプレートファミリ置換（4-axis → 3-layer）
// -----------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0011
describe("US-0002-0011: 3-layer template family replacement", () => {
  it("should reject forbidden 4-axis template files in uiux/", async () => {
    const dir = await newTempDir();
    await createUiBearingPack(dir);
    const uiux = path.join(dir, "uiux");
    // Create forbidden legacy files
    await writeFile(path.join(uiux, "31_anchor.md"), "# Anchor\n\nContent\n", "utf-8");
    await writeFile(path.join(uiux, "60_critique_loop.md"), "# Critique\n\nContent\n", "utf-8");
    const issues = await validateForbiddenLegacyFiles(dir, defaultConfig);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues.every((i) => i.code === "UIX-VAL-3LAYER-FORBIDDEN-FILE")).toBe(true);
  });

  it("should accept 3-layer section headings in eval axis files", async () => {
    const dir = await newTempDir();
    await createUiBearingPack(dir);
    const uiux = path.join(dir, "uiux");
    // Validator reads old split filenames but checks for 3-layer headings
    const evalAxisFiles: Record<string, string> = {
      "20_design_eval_invariant.md": "## invariant\n\nContent\n",
      "21_design_eval_trend_derived.md": "## trend-derived\n\nContent\n",
      "22_design_eval_product_specific.md": "## product-specific\n\nContent\n",
      "23_design_eval_aggregate.md": "## invariant\n\nMore content\n",
    };
    for (const [f, content] of Object.entries(evalAxisFiles)) {
      await writeFile(path.join(uiux, f), content, "utf-8");
    }
    const issues = await validateThreeLayerModel(dir, defaultConfig);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("should accept new 3-layer filename family", async () => {
    const dir = await newTempDir();
    await createUiBearingPack(dir);
    const uiux = path.join(dir, "uiux");
    // Create 3-layer eval axis files with proper headings
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(
        path.join(uiux, f),
        "## invariant\n\nContent\n\n## trend-derived\n\nContent\n\n## product-specific\n\nContent\n",
        "utf-8",
      );
    }
    // Create required 3-layer family file
    await writeFile(
      path.join(uiux, "24_design_eval_dynamic_overrides.md"),
      "# Dynamic Overrides\n\nContent\n",
      "utf-8",
    );
    const threeLayerIssues = await validateThreeLayerModel(dir, defaultConfig);
    const familyIssues = await validateThreeLayerFamilyCompleteness(dir, defaultConfig);
    expect(threeLayerIssues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(familyIssues).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// US-0002-0012: 00_index.md canonical 書き換え
// -----------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0012
describe("US-0002-0012: 00_index.md canonical rewrite", () => {
  it("should detect forbidden 4-axis references in 00_index.md", async () => {
    const content = await readFile(path.join(templateDir, "uiux", "00_index.md"), "utf-8");
    // File Inventory should NOT list old forbidden files as required
    const inventorySection = content.split("## File Inventory")[1]?.split("##")[0] ?? "";
    expect(inventorySection).not.toMatch(/31_anchor\.md/);
    expect(inventorySection).not.toMatch(/60_critique_loop\.md/);
    // Should reference new 3-layer files
    expect(content).toMatch(/11_design_taste_interview\.md/);
    expect(content).toMatch(/24_design_eval_dynamic_overrides\.md/);
  });
});

// -----------------------------------------------------------------------
// US-0010-0009: SKILL.md 3-layer exclusivity
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0009
describe("US-0010-0009: SKILL.md 3-layer exclusivity", () => {
  it("SKILL.md does not contain 4-axis references and uses 3-layer model", async () => {
    const content = await readFile(path.join(templateDir, "..", "SKILL.md"), "utf-8");
    // SKILL.md should not reference old anchor file
    expect(content).not.toMatch(/31_anchor\.md/);
    // SKILL.md should reference 3-layer model artifacts
    expect(content).toMatch(/3-layer|three.layer|invariant.*trend-derived.*product-specific/i);
  });
});

// -----------------------------------------------------------------------
// US-0010-0010: 3-layer template init generation
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0010
describe("US-0010-0010: 3-layer template init generation", () => {
  it("init template directory contains only 3-layer files", async () => {
    const { readdir } = await import("node:fs/promises");
    const uiuxDir = path.join(templateDir, "uiux");
    const files = await readdir(uiuxDir);
    // No forbidden legacy files
    expect(files).not.toContain("31_anchor.md");
    expect(files).not.toContain("60_critique_loop.md");
    // Has new 3-layer files
    expect(files).toContain("11_design_taste_interview.md");
    expect(files).toContain("24_design_eval_dynamic_overrides.md");
  });
});

// -----------------------------------------------------------------------
// US-0010-0011: Canonical 00_index.md and 10_strategy.md
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0011
describe("US-0010-0011: Canonical 00_index.md and 10_strategy.md", () => {
  it("00_index.md exists in uiux templates with file inventory", async () => {
    const content = await readFile(path.join(templateDir, "uiux", "00_index.md"), "utf-8");
    expect(content).toMatch(/File Inventory|Sidecar Index/i);
  });

  it("10_strategy.md exists in uiux templates with YAML strategy", async () => {
    const content = await readFile(path.join(templateDir, "uiux", "10_strategy.md"), "utf-8");
    expect(content).toMatch(/Strategy/);
    expect(content).toMatch(/surface_type|approach|rationale/);
  });
});

// -----------------------------------------------------------------------
// US-0010-0012: 04_Sources.md trend translation
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0012
describe("US-0010-0012: 04_Sources.md trend translation", () => {
  it("04_Sources.md includes competitive reference registry", async () => {
    const content = await readFile(path.join(templateDir, "04_Sources.md"), "utf-8");
    expect(content).toMatch(/Competitive Reference Registry/i);
    expect(content).toMatch(/adopted_points/);
    expect(content).toMatch(/local_translation/);
  });
});

// -----------------------------------------------------------------------
// US-0010-0013: HTML/CSS mock optional
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0013
describe("US-0010-0013: HTML/CSS mock optional", () => {
  it("SKILL.md completion checklist does not gate on HTML/CSS mock", async () => {
    const content = await readFile(path.join(templateDir, "..", "SKILL.md"), "utf-8");
    const checklistSection = content.split("## FINAL CHECKLIST")[1] ?? "";
    // Must not gate on HTML+CSS as mandatory
    const htmlMockLines = checklistSection
      .split("\n")
      .filter((line) => /HTML\+CSS|HTML\/CSS/i.test(line));
    for (const line of htmlMockLines) {
      expect(line.toLowerCase()).toMatch(/optional/);
    }
  });
});

// -----------------------------------------------------------------------
// US-0010-0014: 40_contracts.md screen-obligation schema
// -----------------------------------------------------------------------

// QFAI:SPEC-0010:US-0010-0014
describe("US-0010-0014: 40_contracts.md screen-obligation schema", () => {
  it("40_contracts.md has screen-obligation structure with required states", async () => {
    const content = await readFile(path.join(templateDir, "uiux", "40_contracts.md"), "utf-8");
    expect(content).toMatch(/Screen Contracts/);
    expect(content).toMatch(/Required States/);
    expect(content).toMatch(/Primary Tasks/);
  });
});
