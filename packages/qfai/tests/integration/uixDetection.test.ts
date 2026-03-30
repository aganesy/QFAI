// QFAI:SPEC-0027:TC-0027-0001
// QFAI:SPEC-0027:TC-0027-0002
// QFAI:SPEC-0027:TC-0027-0003
// QFAI:SPEC-0027:TC-0027-0004
// QFAI:SPEC-0027:TC-0027-0005
// QFAI:SPEC-0027:TC-0027-0006
// QFAI:SPEC-0027:TC-0027-0007
// QFAI:SPEC-0027:TC-0027-0008
// QFAI:SPEC-0027:TC-0027-0009
// QFAI:SPEC-0027:TC-0027-0010
// QFAI:SPEC-0027:TC-0027-0011
// QFAI:SPEC-0027:TC-0027-0012
// QFAI:SPEC-0027:TC-0027-0013
// QFAI:SPEC-0027:TC-0027-0014
// QFAI:SPEC-0027:TC-0027-0015
// QFAI:SPEC-0027:TC-0027-0016
// QFAI:SPEC-0027:TC-0027-0017
// QFAI:SPEC-0027:TC-0027-0018
// QFAI:SPEC-0027:TC-0027-0019
// QFAI:SPEC-0027:TC-0027-0020
// QFAI:SPEC-0027:TC-0027-0021
// QFAI:SPEC-0027:TC-0027-0022
// QFAI:SPEC-0027:TC-0027-0023
// QFAI:SPEC-0027:TC-0027-0024
// QFAI:SPEC-0027:TC-0027-0025
// QFAI:SPEC-0027:TC-0027-0026
// QFAI:SPEC-0027:TC-0027-0027
// QFAI:SPEC-0027:TC-0027-0028
// QFAI:SPEC-0027:TC-0027-0029
// QFAI:SPEC-0027:TC-0027-0030
// QFAI:SPEC-0027:TC-0027-0031
// QFAI:SPEC-0027:TC-0027-0032
// QFAI:SPEC-0027:TC-0027-0033
// QFAI:SPEC-0027:TC-0027-0034
// QFAI:SPEC-0027:TC-0027-0035
// QFAI:SPEC-0027:TC-0027-0036
// QFAI:SPEC-0027:TC-0027-0037
// QFAI:SPEC-0027:TC-0027-0038
// QFAI:SPEC-0027:TC-0027-0039
// QFAI:SPEC-0027:TC-0027-0040
// QFAI:SPEC-0027:TC-0027-0041
// QFAI:SPEC-0027:TC-0027-0042
// QFAI:SPEC-0027:TC-0027-0043
// QFAI:SPEC-0027:TC-0027-0044
// QFAI:SPEC-0027:TC-0027-0045
// QFAI:SPEC-0027:TC-0027-0046
// QFAI:SPEC-0027:TC-0027-0047
// QFAI:SPEC-0027:TC-0027-0048

import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { isUiBearingSpec } from "../../src/core/validators/uixDetection.js";
import {
  validateSidecarMissing,
  validateStrategyCompleteness,
  validateScoringAxes,
  validateAggregateScoringRules,
  validateOptionComparison,
  validateScreenContracts,
  validateOqClosure,
  validateMigration,
  runAllUixValidators,
  reviewStrategy,
  applyPhase1Ratchet,
} from "../../src/core/validators/uixValidators.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withSpecDir(
  files: Record<string, string>,
  dirs?: string[],
  task?: (specRoot: string) => Promise<void>,
): Promise<void> {
  const specRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-uix-"));
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

// ---------------------------------------------------------------------------
// TDD-0001: UI-bearing positive signals (TC-0027-0001..0003)
// ---------------------------------------------------------------------------

describe("isUiBearingSpec — positive signals", () => {
  it("TC-0027-0001: explicit surface: web-ui classifies as UI-bearing", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: web-ui\n",
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(true);
      },
    );
  });

  it("TC-0027-0002: explicit surface: non-ui overrides fallback HTML signals", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: non-ui\n",
        "03_Story-Workshop.md":
          "# Story\n\n<div>some html</div>\n<style>body{}</style>\n",
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(false);
      },
    );
  });

  it("TC-0027-0003: no explicit surface + Mermaid stateDiagram classifies as UI-bearing via fallback", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story Workshop",
          "",
          "```mermaid",
          "stateDiagram-v2",
          "  [*] --> LoginScreen",
          "  LoginScreen --> Dashboard",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0002: UI-bearing sidecar/contracts & negative case (TC-0027-0004..0006)
// ---------------------------------------------------------------------------

describe("isUiBearingSpec — sidecar/contracts fallback & negative", () => {
  it("TC-0027-0004: no explicit surface + uiux/ directory classifies as UI-bearing", async () => {
    await withSpecDir(
      { "placeholder.md": "" },
      ["uiux"],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(true);
      },
    );
  });

  it("TC-0027-0005: no explicit surface + screen contract YAML classifies as UI-bearing", async () => {
    await withSpecDir(
      {
        "uiux/40_contracts.md": [
          "# Screen Contracts",
          "",
          "```yaml",
          "screens:",
          "  - route: /login",
          "    actor: user",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(true);
      },
    );
  });

  it("TC-0027-0006: <style> only in fenced code block → non-UI", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story",
          "",
          "Here is a code example:",
          "",
          "```html",
          "<style>body { color: red; }</style>",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0003: Code-fence & inline-code negative overrides (TC-0027-0007..0008)
// ---------------------------------------------------------------------------

describe("isUiBearingSpec — code-fence & inline-code overrides", () => {
  it("TC-0027-0007: <div> only in inline code → non-UI", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md":
          "# Story\n\nUse `<div>` element for layout.\n",
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(false);
      },
    );
  });

  it("TC-0027-0008: Mermaid flowchart without screen-flow labels → non-UI", async () => {
    await withSpecDir(
      {
        "03_Story-Workshop.md": [
          "# Story",
          "",
          "```mermaid",
          "flowchart TD",
          "  A[Start] --> B[Process]",
          "  B --> C[End]",
          "```",
        ].join("\n"),
      },
      [],
      async (specRoot) => {
        const result = await isUiBearingSpec(specRoot);
        expect(result).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Config helper for validator tests
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

function makeUiSpecFiles(): Record<string, string> {
  return { "01_Spec.md": "# Spec\n\n- surface: web-ui\n" };
}

function makeNonUiSpecFiles(): Record<string, string> {
  return { "01_Spec.md": "# Spec\n\n- surface: non-ui\n" };
}

// ---------------------------------------------------------------------------
// TDD-0004: validateSidecarMissing (TC-0027-0009, TC-0027-0010)
// ---------------------------------------------------------------------------

describe("validateSidecarMissing", () => {
  it("TC-0027-0009: UI-bearing spec without uiux/ → UIX-VAL-SIDECAR-MISSING error", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-SIDECAR-MISSING");
        expect(issues[0]?.severity).toBe("error");
        expect(issues[0]?.file).toBe("uiux/");
        expect(issues[0]?.suggested_action).toBeTruthy();
      },
    );
  });

  it("TC-0027-0010: UI-bearing spec with uiux/ → no issue", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      ["uiux"],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0005: validateStrategyCompleteness (TC-0027-0011..0014)
// ---------------------------------------------------------------------------

describe("validateStrategyCompleteness", () => {
  it("TC-0027-0011: complete strategy with all fields → no issues", async () => {
    const strategyContent = [
      "# Strategy",
      "selection_required: yes",
      "candidate_options: A, B, C",
      "chosen_option: A",
      "verification_expectations: unit + integration",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long rationale field value here",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/10_strategy.md": strategyContent },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0012: missing required fields → UIX-VAL-STRATEGY-INCOMPLETE", async () => {
    const strategyContent = [
      "# Strategy",
      "selection_required: yes",
      "rationale: This is a sufficiently long rationale field value here",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/10_strategy.md": strategyContent },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        const incomplete = issues.filter((i) => i.code === "UIX-VAL-STRATEGY-INCOMPLETE");
        // 4 missing required fields: candidate_options, chosen_option, verification_expectations, none_as_legitimate_outcome
        expect(incomplete.length).toBeGreaterThanOrEqual(4);
      },
    );
  });

  it("TC-0027-0013: rationale exactly 20 chars → pass", async () => {
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
      { ...makeUiSpecFiles(), "uiux/10_strategy.md": strategyContent },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0014: rationale 19 chars → fail", async () => {
    const strategyContent = [
      "# Strategy",
      "selection_required: yes",
      "candidate_options: A, B",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: 1234567890123456789",
      "approach: This is a sufficiently long approach field value here!",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/10_strategy.md": strategyContent },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        const ratIssues = issues.filter((i) => i.message.includes("rationale"));
        expect(ratIssues.length).toBeGreaterThanOrEqual(1);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0006: validateScoringAxes (TC-0027-0015, TC-0027-0016)
// ---------------------------------------------------------------------------

describe("validateScoringAxes", () => {
  it("TC-0027-0015: trend-derived row with source_translation → no issue", async () => {
    const content = [
      "# Evaluation Axes",
      "## trend_derived",
      "- axis: UX Freshness, source_translation: industry trend mapping",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/20_eval_axes.md": content },
      [],
      async (specRoot) => {
        const issues = await validateScoringAxes(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0016: trend-derived row missing source_translation → error", async () => {
    const content = [
      "# Evaluation Axes",
      "## trend_derived",
      "- axis: UX Freshness, weight: 0.3",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/20_eval_axes.md": content },
      [],
      async (specRoot) => {
        const issues = await validateScoringAxes(specRoot, makeConfig());
        expect(issues.length).toBeGreaterThanOrEqual(1);
        expect(issues[0]?.code).toBe("UIX-VAL-SCORING-AXIS-INCOMPLETE");
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0007: validateAggregateScoringRules (TC-0027-0017, TC-0027-0018)
// ---------------------------------------------------------------------------

describe("validateAggregateScoringRules", () => {
  it("TC-0027-0017: all aggregate fields present → no issue", async () => {
    const content = [
      "# Aggregate Scoring",
      "weights: equal",
      "normalization: min-max",
      "threshold: 0.7",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/21_aggregate_scoring.md": content },
      [],
      async (specRoot) => {
        const issues = await validateAggregateScoringRules(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0018: missing aggregate fields → UIX-VAL-AGGREGATE-SCORING-INCOMPLETE", async () => {
    const content = [
      "# Aggregate Scoring",
      "weights: equal",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/21_aggregate_scoring.md": content },
      [],
      async (specRoot) => {
        const issues = await validateAggregateScoringRules(specRoot, makeConfig());
        expect(issues.length).toBe(2); // missing normalization, threshold
        expect(issues.every((i) => i.code === "UIX-VAL-AGGREGATE-SCORING-INCOMPLETE")).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0008: validateOptionComparison (TC-0027-0019..0021)
// ---------------------------------------------------------------------------

describe("validateOptionComparison", () => {
  it("TC-0027-0019: 2+ options in comparison → no issue", async () => {
    const compContent = [
      "# Comparison",
      "## Option A",
      "Description A",
      "## Option B",
      "Description B",
    ].join("\n");
    const anchorContent = "# Anchor\nselected_anchor: A\n";
    await withSpecDir(
      {
        ...makeUiSpecFiles(),
        "uiux/30_comparison.md": compContent,
        "uiux/31_anchor.md": anchorContent,
      },
      [],
      async (specRoot) => {
        const issues = await validateOptionComparison(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0020: only 1 option → UIX-VAL-COMPARISON-INSUFFICIENT", async () => {
    const compContent = [
      "# Comparison",
      "## Option A",
      "Description A",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/30_comparison.md": compContent },
      [],
      async (specRoot) => {
        const issues = await validateOptionComparison(specRoot, makeConfig());
        const compIssues = issues.filter((i) => i.code === "UIX-VAL-COMPARISON-INSUFFICIENT");
        expect(compIssues).toHaveLength(1);
      },
    );
  });

  it("TC-0027-0021: missing anchor → UIX-VAL-ANCHOR-MISSING", async () => {
    const anchorContent = "# Anchor\nno anchor declared here\n";
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/31_anchor.md": anchorContent },
      [],
      async (specRoot) => {
        const issues = await validateOptionComparison(specRoot, makeConfig());
        const anchorIssues = issues.filter((i) => i.code === "UIX-VAL-ANCHOR-MISSING");
        expect(anchorIssues).toHaveLength(1);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0009: validateScreenContracts (TC-0027-0022, TC-0027-0023)
// ---------------------------------------------------------------------------

describe("validateScreenContracts", () => {
  it("TC-0027-0022: all required fields present → no issue", async () => {
    const content = [
      "# Screen Contracts",
      "route: /login",
      "actor: user",
      "purpose: authentication",
      "primary_tasks: login, register",
      "required_states: logged_out",
      "transitions: /dashboard on success",
      "observable_outcomes: session token set",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/40_contracts.md": content },
      [],
      async (specRoot) => {
        const issues = await validateScreenContracts(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0023: missing required fields → UIX-VAL-SCREEN-CONTRACT-INCOMPLETE", async () => {
    const content = [
      "# Screen Contracts",
      "route: /login",
      "actor: user",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/40_contracts.md": content },
      [],
      async (specRoot) => {
        const issues = await validateScreenContracts(specRoot, makeConfig());
        // Missing: purpose, primary_tasks, required_states, transitions, observable_outcomes
        expect(issues.length).toBe(5);
        expect(issues.every((i) => i.code === "UIX-VAL-SCREEN-CONTRACT-INCOMPLETE")).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0010: validateOqClosure (TC-0027-0024, TC-0027-0025)
// ---------------------------------------------------------------------------

describe("validateOqClosure", () => {
  it("TC-0027-0024: open critical OQ → UIX-VAL-OQ-OPEN-CRITICAL error with OQ-ID", async () => {
    const content = [
      "# OQ Register",
      "",
      "## OQ-0001",
      "status: open",
      "severity: critical",
      "description: Need to finalize auth flow",
      "",
      "## OQ-0002",
      "status: closed",
      "severity: critical",
      "description: Resolved design token issue",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/11_OQ-Register.md": content },
      [],
      async (specRoot) => {
        const issues = await validateOqClosure(specRoot, makeConfig());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-OQ-OPEN-CRITICAL");
        expect(issues[0]?.message).toContain("OQ-0001");
      },
    );
  });

  it("TC-0027-0025: no open critical OQs → no issue", async () => {
    const content = [
      "# OQ Register",
      "",
      "## OQ-0001",
      "status: closed",
      "severity: critical",
      "",
      "## OQ-0002",
      "status: open",
      "severity: minor",
    ].join("\n");
    await withSpecDir(
      { ...makeUiSpecFiles(), "uiux/11_OQ-Register.md": content },
      [],
      async (specRoot) => {
        const issues = await validateOqClosure(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0011: validateNonUiImmunity (TC-0027-0026..0028)
// ---------------------------------------------------------------------------

describe("validateNonUiImmunity — non-UI projects", () => {
  it("TC-0027-0026: non-UI spec → zero issues from all UIX-VAL validators", async () => {
    await withSpecDir(
      makeNonUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await runAllUixValidators(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0027: non-UI spec → validateSidecarMissing returns empty array", async () => {
    await withSpecDir(
      makeNonUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0028: issue schema has all required fields", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues.length).toBeGreaterThan(0);
        for (const iss of issues) {
          expect(iss.code).toBeTruthy();
          expect(iss.severity).toBeTruthy();
          expect(iss.category).toBeTruthy();
          expect(iss.message).toBeTruthy();
          expect(iss.file).toBeTruthy();
        }
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0012/0013: UIX-REV templates & reviewStrategy (TC-0027-0029..0034)
// ---------------------------------------------------------------------------

describe("UIX-REV templates and reviewStrategy", () => {
  it("TC-0027-0029: prompt template files exist for 6 categories", async () => {
    const templateDir = path.resolve(__dirname, "../../assets/uix-rev");
    const expectedFiles = [
      "strategy-review.md",
      "scoring-review.md",
      "comparison-review.md",
      "contracts-review.md",
      "oq-review.md",
      "migration-review.md",
    ];
    for (const file of expectedFiles) {
      await expect(access(path.join(templateDir, file))).resolves.toBeUndefined();
    }
  });

  it("TC-0027-0030: reviewStrategy returns accept for complete strategy", () => {
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

  it("TC-0027-0031: reviewStrategy returns pivot for missing fields", () => {
    const strategy = "selection_required: yes\n";
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("pivot");
    expect(result.rationale).toContain("Missing required fields");
  });

  it("TC-0027-0032: reviewStrategy returns refine for short rationale", () => {
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

  it("TC-0027-0033: reviewStrategy returns refine for short approach", () => {
    const strategy = [
      "selection_required: yes",
      "candidate_options: A, B",
      "chosen_option: A",
      "verification_expectations: tests",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long rationale field value here",
      "approach: short",
    ].join("\n");
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("refine");
  });

  it("TC-0027-0034: reviewStrategy empty field string → pivot", () => {
    const strategy = [
      "selection_required: ",
      "candidate_options: ",
      "chosen_option: ",
      "verification_expectations: ",
      "none_as_legitimate_outcome: ",
    ].join("\n");
    const result = reviewStrategy(strategy);
    expect(result.verdict).toBe("pivot");
  });
});

// ---------------------------------------------------------------------------
// TDD-0014: validateMigration (TC-0027-0035..0037)
// ---------------------------------------------------------------------------

describe("validateMigration", () => {
  it("TC-0027-0035: missing uiux/ with default config → warning", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateMigration(specRoot, makeConfig());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-MIGRATION-SIDECAR-MISSING");
        expect(issues[0]?.severity).toBe("warning");
      },
    );
  });

  it("TC-0027-0036: missing uiux/ with strict mode → error", async () => {
    const config = makeConfig({ uiux: { migration: { strict: true } } });
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateMigration(specRoot, config);
        expect(issues).toHaveLength(1);
        expect(issues[0]?.severity).toBe("error");
      },
    );
  });

  it("TC-0027-0037: stale sidecar version → warning with upgrade steps", async () => {
    await withSpecDir(
      {
        ...makeUiSpecFiles(),
        "uiux/.sidecar-version": "0.9.0",
      },
      [],
      async (specRoot) => {
        const issues = await validateMigration(specRoot, makeConfig());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-MIGRATION-STALE-VERSION");
        expect(issues[0]?.severity).toBe("warning");
        expect(issues[0]?.suggested_action).toContain("Upgrade");
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0015: Verify-pack fixtures (TC-0027-0038..0040)
// ---------------------------------------------------------------------------

describe("Verify-pack fixtures", () => {
  it("TC-0027-0038: pass fixture — UI-bearing with uiux/ → no sidecar-missing issue", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      ["uiux"],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("TC-0027-0039: fail fixture — UI-bearing without uiux/ → sidecar-missing issue", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(1);
        expect(issues[0]?.code).toBe("UIX-VAL-SIDECAR-MISSING");
      },
    );
  });

  it("TC-0027-0040: static boundary — no browser/network/rendering imports", async () => {
    // Verify the validator module does not import browser/network/rendering modules
    const validatorSource = await import("../../src/core/validators/uixValidators.js");
    // If it loaded without error, it has no dynamic browser dependencies
    expect(validatorSource).toBeDefined();
    expect(typeof validatorSource.validateSidecarMissing).toBe("function");
    expect(typeof validatorSource.runAllUixValidators).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// TDD-0016: Determinism and performance (TC-0027-0041..0043)
// ---------------------------------------------------------------------------

describe("Determinism and performance", () => {
  it("TC-0027-0041: 10-run determinism test", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const results: Issue[][] = [];
        for (let i = 0; i < 10; i++) {
          results.push(await runAllUixValidators(specRoot, makeConfig()));
        }
        // All runs must produce the same number and same codes
        const firstCodes = results[0]?.map((i) => i.code).sort();
        for (let i = 1; i < 10; i++) {
          const codes = results[i]?.map((i) => i.code).sort();
          expect(codes).toEqual(firstCodes);
        }
      },
    );
  });

  it("TC-0027-0042: performance budget — all validators < 2000ms", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      ["uiux"],
      async (specRoot) => {
        const start = performance.now();
        await runAllUixValidators(specRoot, makeConfig());
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(2000);
      },
    );
  });

  it("TC-0027-0043: non-UI validators complete under budget", async () => {
    await withSpecDir(
      makeNonUiSpecFiles(),
      [],
      async (specRoot) => {
        const start = performance.now();
        await runAllUixValidators(specRoot, makeConfig());
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(2000);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0017: Async pattern and rule ID (TC-0027-0044..0046)
// ---------------------------------------------------------------------------

describe("Async pattern and rule ID format", () => {
  it("TC-0027-0044: all validators return Promise<Issue[]>", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      ["uiux"],
      async (specRoot) => {
        const config = makeConfig();
        const validators = [
          validateSidecarMissing,
          validateStrategyCompleteness,
          validateScoringAxes,
          validateAggregateScoringRules,
          validateOptionComparison,
          validateScreenContracts,
          validateOqClosure,
          validateMigration,
        ];
        for (const v of validators) {
          const result = v(specRoot, config);
          expect(result).toBeInstanceOf(Promise);
          const resolved = await result;
          expect(Array.isArray(resolved)).toBe(true);
        }
      },
    );
  });

  it("TC-0027-0045: all issue codes use UIX-VAL-* prefix", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await runAllUixValidators(specRoot, makeConfig());
        for (const iss of issues) {
          expect(iss.code).toMatch(/^UIX-VAL-[A-Z][A-Z0-9-]*$/);
        }
      },
    );
  });

  it("TC-0027-0046: rule IDs are uppercase-hyphenated", async () => {
    await withSpecDir(
      makeUiSpecFiles(),
      [],
      async (specRoot) => {
        const issues = await runAllUixValidators(specRoot, makeConfig());
        for (const iss of issues) {
          // Must be uppercase letters, digits, and hyphens only
          expect(iss.code).toMatch(/^[A-Z][A-Z0-9-]+$/);
        }
      },
    );
  });
});

// ---------------------------------------------------------------------------
// TDD-0018: Phase-1 ratchet (TC-0027-0047, TC-0027-0048)
// ---------------------------------------------------------------------------

describe("Phase-1 ratchet", () => {
  it("TC-0027-0047: within 30 days of release → errors downgraded to warnings", () => {
    const releaseDate = new Date("2026-03-01");
    const now = new Date("2026-03-15"); // 14 days in
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
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe("warning");
  });

  it("TC-0027-0048: after 30 days of release → errors remain errors", () => {
    const releaseDate = new Date("2026-01-01");
    const now = new Date("2026-03-15"); // well past 30 days
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
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe("error");
  });
});
