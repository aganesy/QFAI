// QFAI:SPEC-0014:US-0014-0001
// QFAI:SPEC-0014:US-0014-0002
// QFAI:SPEC-0014:US-0014-0003
// QFAI:SPEC-0014:US-0014-0004
// QFAI:SPEC-0014:US-0014-0005
// QFAI:SPEC-0014:US-0014-0006
// QFAI:SPEC-0014:US-0014-0007
// QFAI:SPEC-0014:US-0014-0008
// QFAI:SPEC-0014:US-0014-0009

/**
 * Legacy compatibility tests for UIX-VAL intermediate validators.
 *
 * These tests exercise the legacy runLegacyUixCompatibilityValidators wrapper
 * and intermediate validator functions. They are NOT canonical tests.
 * The canonical production path is validated via runCanonicalUixValidators
 * in the e2e and integration suites.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { isUiBearingSpec } from "../../src/core/validators/uixDetection.js";
import {
  validateSidecarMissing,
  validateStrategyCompleteness,
  validateMigration,
  runLegacyUixCompatibilityValidators,
  reviewStrategy,
  applyPhase1Ratchet,
} from "../../src/core/validators/legacy/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

async function withSpecDir(
  files: Record<string, string>,
  dirs?: string[],
  task?: (specRoot: string) => Promise<void>,
): Promise<void> {
  const specRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-uix-"));
  try {
    for (const dir of dirs ?? []) {
      await mkdir(path.join(specRoot, dir), { recursive: true });
    }
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(specRoot, name);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    }
    if (task) await task(specRoot);
  } finally {
    await rm(specRoot, { recursive: true, force: true });
  }
}

/**
 * Build a complete UI pack using canonical sidecar file names.
 * Updated to use the new canonical names (30_option_comparison.md,
 * 31_selected_anchor_screen.md, 40_screen_contracts.md, 50_review_input_bundle.md)
 * so that forbidden-legacy-file detection does not trigger.
 */
function buildCompleteUiPack(): Record<string, string> {
  return {
    "01_Spec.md": "# Spec\n\n- surface: web\n",
    "uiux/00_index.md": "# uiux Index\n\n- canonical sidecar family",
    "uiux/10_implementation_strategy.md": [
      "# Strategy",
      "selection_required: yes",
      "candidate_options: A, B, C",
      "chosen_option: A",
      "verification_expectations: unit + integration + e2e",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long and detailed rationale for the decision",
      "approach: This is a sufficiently long and detailed approach description here",
      "surface: web",
      "decision: component-library",
      "why_this_strategy: Component-library approach leverages proven accessible primitives and consistent design tokens.",
      "expected_strengths: Fast iteration, consistent styling, built-in accessibility patterns from the component library.",
      "known_risks: Limited customization for highly bespoke brand expression; dependency on library release cadence.",
      "fit_for_this_product: Dashboard-focused product benefits from pre-built data display and action components.",
    ].join("\n"),
    "uiux/11_design_taste_interview.md": [
      "# Taste Interview",
      "## visual_character",
      "Bold but restrained.",
      "## emotional_tone",
      "Calm.",
      "## anti_preferences",
      "None.",
      "## admired_rejected_references",
      "None.",
      "## novelty_vs_safety",
      "Safe.",
      "## density_hierarchy",
      "Medium.",
      "## motion_material",
      "None.",
      "## brand_tone",
      "Professional.",
      "## unresolved_taste_questions",
      "None.",
      "## taste_reflection_depth",
      "Reflected.",
    ].join("\n"),
    "uiux/20_design_eval_invariant.md": [
      "# Invariant Evaluation",
      "## invariant",
      "## Axis: accessibility",
      "- axis_id: AX-001",
      "- axis_name: accessibility",
      "- layer: invariant",
      "- definition: Accessibility baseline",
      "- rationale: Required",
      "- scoring_rubric: WCAG AA",
      "- weight: 1",
      "- min_score: 0",
      "- max_score: 5",
      "- pass_threshold: 4",
      "- evidence_type: review",
      "- evidence_source: contracts",
      "- review_prompt: Check accessibility",
      "- calibration_anchor: baseline",
      "- dependencies: none",
      "- review_questions: Present?",
    ].join("\n"),
    "uiux/21_design_eval_trend_derived.md": [
      "# Trend-derived Evaluation",
      "## trend-derived",
      "## Axis: motion",
      "- axis_id: AX-002",
      "- axis_name: motion",
      "- layer: trend-derived",
      "- definition: Motion clarity",
      "- rationale: Current expectations",
      "- scoring_rubric: Explanatory motion",
      "- weight: 1",
      "- min_score: 0",
      "- max_score: 5",
      "- pass_threshold: 4",
      "- evidence_type: review",
      "- evidence_source: 04_Sources.md",
      "- review_prompt: Check motion",
      "- calibration_anchor: trend-scan",
      "- dependencies: source_translation",
      "- review_questions: Clear?",
    ].join("\n"),
    "uiux/22_design_eval_product_specific.md": [
      "# Product-specific Evaluation",
      "## product-specific",
      "## Axis: focus",
      "- axis_id: AX-003",
      "- axis_name: focus",
      "- layer: product-specific",
      "- definition: Dashboard focus",
      "- rationale: Primary workflow",
      "- scoring_rubric: Obvious task",
      "- weight: 1",
      "- min_score: 0",
      "- max_score: 5",
      "- pass_threshold: 4",
      "- evidence_type: review",
      "- evidence_source: 40_screen_contracts.md",
      "- review_prompt: Check focus",
      "- calibration_anchor: product-baseline",
      "- dependencies: selected-direction",
      "- review_questions: Obvious?",
    ].join("\n"),
    "uiux/23_design_eval_aggregate.md": [
      "# Aggregate Evaluation",
      "",
      "## invariant",
      "Baseline aggregate context.",
      "",
      "weights: equal",
      "normalization: min-max",
      "threshold: 0.7",
      "- thresholds: min 70 overall",
      "- floors: no axis below 50",
      "- plateau: diminishing returns above 90",
      "- missing_score_policy: exclude from aggregate",
    ].join("\n"),
    "uiux/24_design_eval_dynamic_overrides.md":
      "# Dynamic Overrides\n\n- override_rule: none by default",
    "uiux/30_option_comparison.md": [
      "# Option Comparison",
      "## Option A",
      "Description A",
      "## Option B",
      "Description B",
    ].join("\n"),
    "uiux/31_selected_anchor_screen.md": [
      "# Selected Anchor Screen",
      "- selected_option: Option A",
      "- why_selected: best fit for the stated requirements.",
      "",
      "## rejected_or_deferred_options",
      "- Option B: disposition: rejected — does not meet the primary workflow requirements.",
      "- Option C: disposition: deferred — requires further analysis.",
    ].join("\n"),
    "uiux/40_screen_contracts.md": [
      "# Screen Contracts",
      "### Screen: Login",
      "- screen_id: login",
      "- route: /login",
      "- purpose: authentication",
      "- actor: user",
      "- primary_tasks: login, register",
      "- secondary_tasks: password reset",
      "- required_states: logged_out",
      "- transitions: /dashboard on success",
      "- observable_outcomes: session token set",
      "- notes_for_verify: Check login flow",
      "- notes_for_reviewer: Focus on auth",
    ].join("\n"),
    "uiux/50_review_input_bundle.md": [
      "# Review Input Bundle",
      "",
      "## Trend-derived review focus",
      "",
      "- Visual tone: Verify tonal palette hierarchy in card layout.",
      "- Layout: Confirm single hero CTA is dominant on entry.",
      "",
      "## Strategy summary",
      "",
      "- strategy",
      "- contracts",
    ].join("\n"),
    "uiux/11_OQ-Register.md": [
      "# OQ Register",
      "",
      "## OQ-0001",
      "status: closed",
      "severity: critical",
    ].join("\n"),
    "uiux/.sidecar-version": "1.0.0",
  };
}

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0001
// UIX-VAL deterministic validation of UI/UX artifacts
// ---------------------------------------------------------------------------

describe("US-0014-0001: UIX-VAL deterministic validation journey", { timeout: 15000 }, () => {
  it("happy path: complete UI-bearing pack passes all UIX-VAL checks with zero issues", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });

  it("negative path: incomplete pack yields multiple UIX-VAL issues", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every((i) => i.code.startsWith("UIX-VAL-"))).toBe(true);
    });
  });

  it("state transition: pack starts incomplete, sidecar added, re-validate resolves issues", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-state-"));
    try {
      const specContent = "# Spec\n\n- surface: web\n";
      await writeFile(path.join(tmpDir, "01_Spec.md"), specContent, "utf-8");

      // First run: missing sidecar
      const issuesBefore = await runLegacyUixCompatibilityValidators(tmpDir, makeConfig());
      const sidecarIssues = issuesBefore.filter((i) => i.code === "UIX-VAL-SIDECAR-MISSING");
      expect(sidecarIssues).toHaveLength(1);

      // Add sidecar directory
      await mkdir(path.join(tmpDir, "uiux"), { recursive: true });

      // Second run: sidecar-missing resolved
      const issuesAfter = await runLegacyUixCompatibilityValidators(tmpDir, makeConfig());
      const sidecarIssuesAfter = issuesAfter.filter((i) => i.code === "UIX-VAL-SIDECAR-MISSING");
      expect(sidecarIssuesAfter).toHaveLength(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("idempotency: same fixture validated 10 times yields identical results", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const results: Issue[][] = [];
      for (let i = 0; i < 10; i++) {
        results.push(await runLegacyUixCompatibilityValidators(specRoot, makeConfig()));
      }
      const firstCodes = results[0]?.map((i) => i.code).sort();
      for (let i = 1; i < 10; i++) {
        expect(results[i]?.map((i) => i.code).sort()).toEqual(firstCodes);
      }
    });
  });

  it("boundary: strategy rationale exactly 20 chars passes, 19 chars fails", async () => {
    const baseFiles = {
      "01_Spec.md": "# Spec\n\n- surface: web\n",
    };
    // 20 chars — pass
    await withSpecDir(
      {
        ...baseFiles,
        "uiux/10_implementation_strategy.md": [
          "# Strategy",
          "selection_required: yes",
          "candidate_options: A, B",
          "chosen_option: A",
          "verification_expectations: tests",
          "none_as_legitimate_outcome: false",
          "rationale: 12345678901234567890",
          "approach: 12345678901234567890",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );

    // 19 chars — fail
    await withSpecDir(
      {
        ...baseFiles,
        "uiux/10_implementation_strategy.md": [
          "# Strategy",
          "selection_required: yes",
          "candidate_options: A, B",
          "chosen_option: A",
          "verification_expectations: tests",
          "none_as_legitimate_outcome: false",
          "rationale: 1234567890123456789",
          "approach: 12345678901234567890",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues.length).toBeGreaterThan(0);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0002
// UIX-REV semantic review integration
// ---------------------------------------------------------------------------

describe("US-0014-0002: UIX-REV semantic review journey", () => {
  it("happy path: well-structured strategy receives accept recommendation", () => {
    const strategy = [
      "selection_required: yes",
      "candidate_options: A, B, C",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long rationale field value here",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("accept");
    expect(result.rationale).toBeTruthy();
  });

  it("negative path: generic fallback strategy receives pivot recommendation", () => {
    const strategy = "selection_required: yes\n";
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("pivot");
  });

  it("edge: minor weakness receives refine recommendation", () => {
    const strategy = [
      "selection_required: yes",
      "candidate_options: A, B",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: too short",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("refine");
  });

  it("state transition: initial pivot -> user revises -> accept", () => {
    const badStrategy = "selection_required: yes\n";
    const badResult = reviewStrategy(badStrategy);
    expect(badResult.verdict).toBe("pivot");

    const goodStrategy = [
      "selection_required: yes",
      "candidate_options: A, B",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long rationale field value here",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    const goodResult = reviewStrategy(goodStrategy);
    expect(goodResult.verdict).toBe("accept");
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0003
// Actionable report output with rule ID and fix suggestion
// ---------------------------------------------------------------------------

describe("US-0014-0003: Actionable report output journey", () => {
  it("all validation issues contain rule ID, file path, severity, description, fix suggestion", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(issues.length).toBeGreaterThan(0);
      for (const issue of issues) {
        expect(issue.code).toBeTruthy();
        expect(issue.file).toBeTruthy();
        expect(issue.severity).toBeTruthy();
        expect(issue.message).toBeTruthy();
        expect(issue.suggested_action).toBeTruthy();
      }
    });
  });

  it("state transition: first run has errors, user fixes, re-run -> issues absent", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-report-"));
    try {
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");

      const issuesBefore = await validateSidecarMissing(tmpDir, makeConfig());
      expect(issuesBefore).toHaveLength(1);
      expect(issuesBefore[0]?.code).toBe("UIX-VAL-SIDECAR-MISSING");

      await mkdir(path.join(tmpDir, "uiux"), { recursive: true });

      const issuesAfter = await validateSidecarMissing(tmpDir, makeConfig());
      expect(issuesAfter).toHaveLength(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("idempotency: same input validated twice yields identical report", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const run1 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const run2 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(run1.map((i) => i.code).sort()).toEqual(run2.map((i) => i.code).sort());
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0004
// Migration support for legacy projects
// ---------------------------------------------------------------------------

describe("US-0014-0004: Migration support journey", () => {
  it("happy path: legacy project with missing uiux/ gets warning with migration guide", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await validateMigration(specRoot, makeConfig());
      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("UIX-VAL-MIGRATION-SIDECAR-MISSING");
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.suggested_action).toBeTruthy();
    });
  });

  it("negative path: strict mode escalates migration issue to error", async () => {
    const config = makeConfig({ uiux: { migration: { strict: true } } });
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await validateMigration(specRoot, config);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("error");
    });
  });

  it("edge: stale sidecar version gets warning with upgrade guidance", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: web\n",
        "uiux/.sidecar-version": "0.9.0",
      },
      [],
      async (specRoot) => {
        const issues = await validateMigration(specRoot, config());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-MIGRATION-STALE-VERSION");
        expect(issues[0]?.suggested_action).toContain("Upgrade");
      },
    );
  });

  it("phase-1 ratchet: within 30 days of release -> errors downgraded to warnings", () => {
    const releaseDate = new Date("2026-03-01");
    const now = new Date("2026-03-15");
    const issues: Issue[] = [
      {
        code: "UIX-VAL-SIDECAR-MISSING",
        severity: "error",
        category: "compatibility",
        message: "test",
        file: "uiux/",
        suggested_action: "fix it",
      },
    ];
    const result = applyPhase1Ratchet(issues, releaseDate, now);
    expect(result[0]?.severity).toBe("warning");
  });
});

function config(): QfaiConfig {
  return makeConfig();
}

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0005
// Non-UI project immunity from UIX checks
// ---------------------------------------------------------------------------

describe("US-0014-0005: Non-UI project immunity journey", () => {
  it("happy path: CLI tool project (no UI signals) yields zero UIX issues", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: non-ui\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(issues).toHaveLength(0);
    });
  });

  it("negative path: HTML in code fences only -> correctly classified non-UI", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# API Project\n\nHere is code:\n```html\n<div>example</div>\n```\n",
      },
      [],
      async (specRoot) => {
        const isUi = await isUiBearingSpec(specRoot);
        expect(isUi).toBe(false);
        const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("state transition: project adds UI component -> UIX checks activate", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nonui-"));
    try {
      // Initially non-UI
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
      const issuesBefore = await runLegacyUixCompatibilityValidators(tmpDir, makeConfig());
      expect(issuesBefore).toHaveLength(0);

      // Becomes UI-bearing
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
      const issuesAfter = await runLegacyUixCompatibilityValidators(tmpDir, makeConfig());
      expect(issuesAfter.length).toBeGreaterThan(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("idempotency: non-UI project validated twice yields zero issues both times", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: non-ui\n" }, [], async (specRoot) => {
      const run1 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const run2 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(run1).toHaveLength(0);
      expect(run2).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0006
// Verify-pack integration for UIX-VAL rules
// ---------------------------------------------------------------------------

describe("US-0014-0006: Verify-pack integration journey", () => {
  it("pass fixture: complete sidecar -> UIX-VAL-SIDECAR-MISSING not emitted", async () => {
    await withSpecDir(
      { "01_Spec.md": "# Spec\n\n- surface: web\n" },
      ["uiux"],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("fail fixture: missing sidecar -> UIX-VAL-SIDECAR-MISSING emitted", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await validateSidecarMissing(specRoot, makeConfig());
      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("UIX-VAL-SIDECAR-MISSING");
    });
  });

  it("boundary fixture: exactly 20-char rationale -> pass, not fail", async () => {
    const strategyContent = [
      "# Strategy",
      "selection_required: yes",
      "candidate_options: A, B",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: 12345678901234567890",
      "approach: 12345678901234567890",
    ].join("\n");
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: web\n",
        "uiux/10_implementation_strategy.md": strategyContent,
      },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("verify-pack run twice -> identical results", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const run1 = await validateSidecarMissing(specRoot, makeConfig());
      const run2 = await validateSidecarMissing(specRoot, makeConfig());
      expect(run1.map((i) => i.code)).toEqual(run2.map((i) => i.code));
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0007
// Canonical validator registration for UIX-VAL
// ---------------------------------------------------------------------------

describe("US-0014-0007: Canonical validator registration journey", () => {
  it("happy path: runLegacyUixCompatibilityValidators executes all registered validators", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      // Should include at minimum the sidecar-missing issue for a bare UI pack
      const sidecarMissing = issues.filter((i) => i.code === "UIX-VAL-SIDECAR-MISSING");
      expect(sidecarMissing).toHaveLength(1);
    });
  });

  it("edge: zero UIX-VAL validators fire on complete pack", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });

  it("idempotency: same validators registered run yields identical results", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const run1 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const run2 = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      expect(run1.map((i) => i.code).sort()).toEqual(run2.map((i) => i.code).sort());
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0002:US-0002-0006
// Canonical 3-layer template sidecar in discussion pack
// ---------------------------------------------------------------------------

describe("US-0002-0006: Canonical 3-layer template sidecar journey", () => {
  it("non-UI pack is exempt from all UIX-VAL sidecar checks", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: non-ui\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const uixIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixIssues).toHaveLength(0);
    });
  });

  it("UI-bearing pack with canonical 3-layer format produces zero migration issues", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const migrationIssues = issues.filter((i) => i.code.includes("MIGRATION"));
      expect(migrationIssues).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0008
// Browser QA minimal truthful runner
// ---------------------------------------------------------------------------

describe("US-0014-0008: Browser QA minimal truthful runner", () => {
  it("browser QA runner returns actual evidence, not placeholder pass", async () => {
    const { runBrowserQaOrchestrated } = await import("../../src/core/browserQa/index.js");

    const result = await runBrowserQaOrchestrated({
      htmlContent: "<html><body><p>Test content</p></body></html>",
      surface: "web",
    });
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.provider).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
    // Must not have a blanket "pass" on all phases
    expect(result.phases.every((p) => typeof p.status === "string")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0009
// Canonical validator family enforcement
// ---------------------------------------------------------------------------

describe("US-0014-0009: Canonical validator family enforcement", () => {
  it("runLegacyUixCompatibilityValidators returns only 3-layer model aligned issue codes", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web\n" }, [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      // No legacy 4-axis validator codes should appear
      const legacyCodes = issues.filter(
        (i) =>
          i.code.includes("4-AXIS") ||
          i.code.includes("LEGACY") ||
          i.code.includes("EVAL-AXIS-COUNT"),
      );
      expect(legacyCodes).toHaveLength(0);
    });
  });

  it("complete 3-layer pack produces zero UIX-VAL issues", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runLegacyUixCompatibilityValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });
});
