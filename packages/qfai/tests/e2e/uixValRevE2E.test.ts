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
 * E2E tests for spec-0027 — UIX-VAL / UIX-REV validation.
 *
 * Verifies high-level user journeys from sidecar creation through
 * validation and migration, including non-UI immunity and canonical
 * validator registration.
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
  runAllUixValidators,
  reviewStrategy,
  applyPhase1Ratchet,
} from "../../src/core/validators/uixValidators.js";

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

function buildCompleteUiPack(): Record<string, string> {
  return {
    "01_Spec.md": "# Spec\n\n- surface: web-ui\n",
    "uiux/10_strategy.md": [
      "# Strategy",
      "selection_required: yes",
      "candidate_options: A, B, C",
      "chosen_option: A",
      "verification_expectations: unit + integration + e2e",
      "none_as_legitimate_outcome: false",
      "rationale: This is a sufficiently long and detailed rationale for the decision",
      "approach: This is a sufficiently long and detailed approach description here",
    ].join("\n"),
    "uiux/20_eval_axes.md": [
      "# Evaluation Axes",
      "## trend_derived",
      "- axis: UX Freshness, source_translation: industry trend mapping",
    ].join("\n"),
    "uiux/21_aggregate_scoring.md": [
      "# Aggregate Scoring",
      "weights: equal",
      "normalization: min-max",
      "threshold: 0.7",
    ].join("\n"),
    "uiux/30_comparison.md": [
      "# Comparison",
      "## Option A",
      "Description A",
      "## Option B",
      "Description B",
      "## Recommendation",
      "Selected: Option A — best fit for the stated requirements.",
    ].join("\n"),
    "uiux/40_contracts.md": [
      "# Screen Contracts",
      "route: /login",
      "actor: user",
      "purpose: authentication",
      "primary_tasks: login, register",
      "required_states: logged_out",
      "transitions: /dashboard on success",
      "observable_outcomes: session token set",
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
      const issues = await runAllUixValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });

  it("negative path: incomplete pack yields multiple UIX-VAL issues", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every((i) => i.code.startsWith("UIX-VAL-"))).toBe(true);
    });
  });

  it("state transition: pack starts incomplete, sidecar added, re-validate resolves issues", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-state-"));
    try {
      const specContent = "# Spec\n\n- surface: web-ui\n";
      await writeFile(path.join(tmpDir, "01_Spec.md"), specContent, "utf-8");

      // First run: missing sidecar
      const issuesBefore = await runAllUixValidators(tmpDir, makeConfig());
      const sidecarIssues = issuesBefore.filter((i) => i.code === "UIX-VAL-SIDECAR-MISSING");
      expect(sidecarIssues).toHaveLength(1);

      // Add sidecar directory
      await mkdir(path.join(tmpDir, "uiux"), { recursive: true });

      // Second run: sidecar-missing resolved
      const issuesAfter = await runAllUixValidators(tmpDir, makeConfig());
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
        results.push(await runAllUixValidators(specRoot, makeConfig()));
      }
      const firstCodes = results[0]?.map((i) => i.code).sort();
      for (let i = 1; i < 10; i++) {
        expect(results[i]?.map((i) => i.code).sort()).toEqual(firstCodes);
      }
    });
  });

  it("boundary: strategy rationale exactly 20 chars passes, 19 chars fails", async () => {
    const baseFiles = {
      "01_Spec.md": "# Spec\n\n- surface: web-ui\n",
    };
    // 20 chars — pass
    await withSpecDir(
      {
        ...baseFiles,
        "uiux/10_strategy.md": [
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
        "uiux/10_strategy.md": [
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
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
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
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");

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
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const run1 = await runAllUixValidators(specRoot, makeConfig());
      const run2 = await runAllUixValidators(specRoot, makeConfig());
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
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await validateMigration(specRoot, makeConfig());
      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe("UIX-VAL-MIGRATION-SIDECAR-MISSING");
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.suggested_action).toBeTruthy();
    });
  });

  it("negative path: strict mode escalates migration issue to error", async () => {
    const config = makeConfig({ uiux: { migration: { strict: true } } });
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await validateMigration(specRoot, config);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("error");
    });
  });

  it("edge: stale sidecar version gets warning with upgrade guidance", async () => {
    await withSpecDir(
      {
        "01_Spec.md": "# Spec\n\n- surface: web-ui\n",
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
      const issues = await runAllUixValidators(specRoot, makeConfig());
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
        const issues = await runAllUixValidators(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("state transition: project adds UI component -> UIX checks activate", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-nonui-"));
    try {
      // Initially non-UI
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
      const issuesBefore = await runAllUixValidators(tmpDir, makeConfig());
      expect(issuesBefore).toHaveLength(0);

      // Becomes UI-bearing
      await writeFile(path.join(tmpDir, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
      const issuesAfter = await runAllUixValidators(tmpDir, makeConfig());
      expect(issuesAfter.length).toBeGreaterThan(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("idempotency: non-UI project validated twice yields zero issues both times", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: non-ui\n" }, [], async (specRoot) => {
      const run1 = await runAllUixValidators(specRoot, makeConfig());
      const run2 = await runAllUixValidators(specRoot, makeConfig());
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
      { "01_Spec.md": "# Spec\n\n- surface: web-ui\n" },
      ["uiux"],
      async (specRoot) => {
        const issues = await validateSidecarMissing(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("fail fixture: missing sidecar -> UIX-VAL-SIDECAR-MISSING emitted", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
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
        "01_Spec.md": "# Spec\n\n- surface: web-ui\n",
        "uiux/10_strategy.md": strategyContent,
      },
      [],
      async (specRoot) => {
        const issues = await validateStrategyCompleteness(specRoot, makeConfig());
        expect(issues).toHaveLength(0);
      },
    );
  });

  it("verify-pack run twice -> identical results", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
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
  it("happy path: runAllUixValidators executes all registered validators", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
      // Should include at minimum the sidecar-missing issue for a bare UI pack
      const sidecarMissing = issues.filter((i) => i.code === "UIX-VAL-SIDECAR-MISSING");
      expect(sidecarMissing).toHaveLength(1);
    });
  });

  it("edge: zero UIX-VAL validators fire on complete pack", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });

  it("idempotency: same validators registered run yields identical results", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const run1 = await runAllUixValidators(specRoot, makeConfig());
      const run2 = await runAllUixValidators(specRoot, makeConfig());
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
      const issues = await runAllUixValidators(specRoot, makeConfig());
      const uixIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixIssues).toHaveLength(0);
    });
  });

  it("UI-bearing pack with canonical 3-layer format produces zero migration issues", async () => {
    await withSpecDir(buildCompleteUiPack(), [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
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
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");

    const result = runBrowserQa("<html><body><p>Test content</p></body></html>");
    expect(result.status).toBe("completed");
    expect(result.metadata).toBeDefined();
    expect(result.metadata.runner).toBe("qfai-browser-qa-minimal");
    expect(result.metadata.timestamp).toBeTruthy();
    // Must not have a blanket "pass" status
    expect(result.status).not.toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// QFAI:SPEC-0014:US-0014-0009
// Canonical validator family enforcement
// ---------------------------------------------------------------------------

describe("US-0014-0009: Canonical validator family enforcement", () => {
  it("runAllUixValidators returns only 3-layer model aligned issue codes", async () => {
    await withSpecDir({ "01_Spec.md": "# Spec\n\n- surface: web-ui\n" }, [], async (specRoot) => {
      const issues = await runAllUixValidators(specRoot, makeConfig());
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
      const issues = await runAllUixValidators(specRoot, makeConfig());
      const uixValIssues = issues.filter((i) => i.code.startsWith("UIX-VAL-"));
      expect(uixValIssues).toHaveLength(0);
    });
  });
});
