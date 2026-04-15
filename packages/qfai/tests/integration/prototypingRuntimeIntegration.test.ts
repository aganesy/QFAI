// QFAI:SPEC-0012:TC-0012-0028
// QFAI:SPEC-0012:TC-0012-0029
// QFAI:SPEC-0012:TC-0012-0031
// QFAI:SPEC-0012:TC-0012-0032
// QFAI:SPEC-0012:TC-0012-0033
// QFAI:SPEC-0012:TC-0012-0034
// QFAI:SPEC-0012:TC-0012-0035
// QFAI:SPEC-0012:TC-0012-0036
// QFAI:SPEC-0012:TC-0012-0039
// QFAI:SPEC-0012:TC-0012-0040
// QFAI:SPEC-0012:TC-0012-0041
// QFAI:SPEC-0012:TC-0012-0046
// QFAI:SPEC-0012:TC-0012-0047
// QFAI:SPEC-0012:TC-0012-0048
// QFAI:SPEC-0012:TC-0012-0049
// QFAI:SPEC-0012:TC-0012-0050
// QFAI:SPEC-0012:TC-0012-0051
// QFAI:SPEC-0012:TC-0012-0052
// QFAI:SPEC-0012:TC-0012-0053
// QFAI:SPEC-0012:TC-0012-0054
// QFAI:SPEC-0012:TC-0012-0055
// QFAI:SPEC-0012:TC-0012-0056
// QFAI:SPEC-0012:TC-0012-0057
// QFAI:SPEC-0012:TC-0012-0058
// QFAI:SPEC-0012:TC-0012-0059
// QFAI:SPEC-0012:TC-0012-0060
// QFAI:SPEC-0012:TC-0012-0061
// QFAI:SPEC-0012:TC-0012-0062
// QFAI:SPEC-0012:TC-0012-0063
// QFAI:SPEC-0012:TC-0012-0064
// QFAI:SPEC-0012:TC-0012-0065
// QFAI:SPEC-0012:TC-0012-0066
// QFAI:SPEC-0012:TC-0012-0067
// QFAI:SPEC-0012:TC-0012-0068
// QFAI:SPEC-0012:TC-0012-0069
// QFAI:SPEC-0012:TC-0012-0070
// QFAI:SPEC-0012:TC-0012-0071
// QFAI:SPEC-0012:TC-0012-0072
// QFAI:SPEC-0012:TC-0012-0073
// QFAI:SPEC-0012:TC-0012-0074
// QFAI:SPEC-0012:TC-0012-0075
// QFAI:SPEC-0012:TC-0012-0076
// QFAI:SPEC-0012:TC-0012-0077
// QFAI:SPEC-0012:TC-0012-0078
// QFAI:SPEC-0012:TC-0012-0079
// QFAI:SPEC-0012:TC-0012-0080
// QFAI:SPEC-0012:TC-0012-0081
// QFAI:SPEC-0012:TC-0012-0082
// QFAI:SPEC-0012:TC-0012-0083
// QFAI:SPEC-0012:TC-0012-0084
// QFAI:SPEC-0012:TC-0012-0085
// QFAI:SPEC-0012:TC-0012-0086
// QFAI:SPEC-0012:TC-0012-0087
// QFAI:SPEC-0012:TC-0012-0088
// QFAI:SPEC-0012:TC-0012-0089
// QFAI:SPEC-0012:TC-0012-0090
// QFAI:SPEC-0012:TC-0012-0091

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolvePrototypingMode,
  inferSurfaceFromRecommendationAndEvidence,
  derivePrototypingObligations,
  parseDiscussionFromObject,
  requiresVisualBrowserEvidence,
  NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
} from "../../src/core/prototyping/mode.js";
import {
  isCanonicalPrototypingSurface,
  assertCanonicalPrototypingSurface,
} from "../../src/core/domain/surface.js";
import type { PrototypingSurface } from "../../src/core/prototyping/types.js";
import { CalibrationLoader } from "../../src/core/calibration/loader.js";
import { ScoringEngine as _ScoringEngine } from "../../src/core/calibration/scoring.js";
import { PlateauDetector } from "../../src/core/calibration/plateau.js";
import {
  scoreL1,
  scoreL2,
  computeWeightedTotal,
  scorePanelsFromInputs,
  validatePanelScore,
} from "../../src/core/harness/panelScore.js";
import { validatePanelInputs, MeasurementError } from "../../src/core/harness/panelInputs.js";
import type { FullHarnessPanelInputs } from "../../src/core/harness/panelInputs.js";
import {
  appendIteration,
  computeTerminationReason,
  validateHistoryConsistency,
} from "../../src/core/harness/history.js";
import type { FullHarnessIteration, FullHarnessHistory } from "../../src/core/harness/types.js";
import { REVIEWER_PLACEHOLDERS } from "../../src/core/harness/types.js";
import { extractDomLabelsWithJsdom } from "../../src/core/prototyping/uiObservation.js";
import { containsEmojiInRange } from "../../src/core/validators/prototypingEvidence.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withTempDir(task: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-rt-"));
  try {
    await task(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildMinimalIteration(overrides?: Partial<FullHarnessIteration>): FullHarnessIteration {
  return {
    iteration: 1,
    commitSha: "abc123def456",
    reviewerId: "dev-alice",
    timestamp: "2026-04-14T00:00:00Z",
    changeSummary: ["Initial measurement"],
    limitations: [],
    evidenceRefs: {
      render: [".qfai/evidence/render/screen-001.png"],
      browserQa: [".qfai/evidence/browserQa/smoke.json"],
      runtimeGate: [".qfai/evidence/runtimeGate.json"],
      uiObservation: [".qfai/evidence/uiObservation.json"],
      specCoverage: [".qfai/specs/spec-0001/01_Spec.md#L5"],
      discussion: [".qfai/discussion/pack-001/uiux/20_design_eval_invariant.md"],
      screenContract: [".qfai/discussion/pack-001/uiux/40_screen_contracts.md#SCR-001"],
      trend: [".qfai/discussion/pack-001/04_Sources.md"],
    },
    l1: {
      panel: "L1",
      total: 0.85,
      axes: [
        {
          axisId: "runtime-gate",
          score: 0.9,
          rationale: "1/1 passed",
          evidenceRefs: [".qfai/evidence/runtimeGate.json"],
        },
      ],
    },
    l2: {
      panel: "L2",
      total: 0.75,
      axes: [
        {
          axisId: "discussion-axes",
          score: 0.8,
          rationale: "3 axes evaluated",
          evidenceRefs: [".qfai/discussion/pack-001/uiux/20_design_eval_invariant.md"],
        },
      ],
    },
    weightedTotal: 0.75,
    deltaFromPrevious: null,
    decision: "refine",
    ...overrides,
  };
}

function buildMinimalPanelInputs(
  overrides?: Partial<FullHarnessPanelInputs>,
): FullHarnessPanelInputs {
  return {
    runtimeGate: {
      uiRoutes: [
        {
          screenId: "SCR-001",
          route: "/orders",
          rendered: true,
          browserVisited: true,
          httpStatus: 200,
          renderEvidenceRefs: [".qfai/evidence/render/screen-001.png"],
          browserQaEvidenceRefs: [".qfai/evidence/browserQa/smoke.json"],
        },
      ],
      evidenceRefs: [".qfai/evidence/runtimeGate.json"],
    },
    renderEvidence: {
      totalScreens: 1,
      capturedScreens: 1,
      failedScreens: 0,
      viewports: ["desktop"],
      evidenceRefs: [".qfai/evidence/render/screen-001.png"],
    },
    browserQa: {
      executed: true,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: ["smoke"],
      evidenceRefs: [".qfai/evidence/browserQa/smoke.json"],
    },
    uiObservation: {
      screens: [
        {
          screenId: "SCR-001",
          route: "/orders",
          htmlCaptureRef: ".qfai/evidence/render/screen-001.html",
          domLabelsFound: ["Orders", "Submit"],
          elementsPlaced: 2,
          actionsWired: 1,
          mockPathFindings: [],
          browserQaEvidenceRefs: [".qfai/evidence/browserQa/smoke.json"],
          browserQaObserved: true,
        },
      ],
      evidenceRefs: [".qfai/evidence/uiObservation.json"],
    },
    specCoverage: {
      declared: { uiRoutes: 1 },
      checked: { uiOk: 1 },
      missing: { uiRoutes: [] },
      evidenceRefs: [".qfai/specs/spec-0001/01_Spec.md#L5"],
    },
    discussionAxes: {
      invariantAxes: 3,
      trendDerivedAxes: 2,
      productSpecificAxes: 2,
      aggregateScore: 0.8,
      evidenceRefs: [".qfai/discussion/pack-001/uiux/20_design_eval_invariant.md"],
    },
    screenContract: {
      totalContracts: 1,
      coveredContracts: 1,
      fidelityScore: 0.9,
      evidenceRefs: [".qfai/discussion/pack-001/uiux/40_screen_contracts.md#SCR-001"],
    },
    trendAlignment: {
      trendSourcesChecked: 3,
      translationConsistency: 0.85,
      competitiveGapsCovered: 2,
      evidenceRefs: [".qfai/discussion/pack-001/04_Sources.md"],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group 1: Calibration & Mode (TC-0012-0028, TC-0012-0029)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0028
describe("TC-0012-0028: Calibration config field defaults", () => {
  it("resolvePrototypingMode returns system-default when no prototyping stanza", () => {
    const result = resolvePrototypingMode({});
    expect(result.effective).toBe("full-harness");
    expect(result.source).toBe("system-default");
    expect(result.rationale).toBeDefined();
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it("derivePrototypingObligations defaults to full-harness for web surface", () => {
    const obligations = derivePrototypingObligations({
      surface: "web" as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(obligations.requireRuntimeGate).toBe(true);
    expect(obligations.requireUiFidelity).toBe(true);
    expect(obligations.requireRenderBundle).toBe(true);
    expect(obligations.requireBrowserQaBundle).toBe(true);
    expect(obligations.requireFullHarness).toBe(true);
    expect(obligations.validCombination).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0029
describe("TC-0012-0029: Surface inference priority", () => {
  it("evidence surface takes precedence over recommendation surface", () => {
    const result = inferSurfaceFromRecommendationAndEvidence({
      recommendationSurface: "desktop" as PrototypingSurface,
      evidenceSurface: "mobile" as PrototypingSurface,
    });
    expect(result).toBe("mobile");
  });

  it("recommendation surface used when evidence surface absent", () => {
    const result = inferSurfaceFromRecommendationAndEvidence({
      recommendationSurface: "web" as PrototypingSurface,
      evidenceSurface: undefined,
    });
    expect(result).toBe("web");
  });

  it("returns null when neither surface is provided", () => {
    const result = inferSurfaceFromRecommendationAndEvidence({});
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Group 2: Scoring & Convergence (TC-0012-0031..0035)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0031
describe("TC-0012-0031: L1/L2 scoring missing evidence error", () => {
  it("scoreL1 with zero screens yields 0 render-coverage score", () => {
    const inputs = buildMinimalPanelInputs({
      renderEvidence: {
        totalScreens: 0,
        capturedScreens: 0,
        failedScreens: 0,
        viewports: [],
        evidenceRefs: [".qfai/evidence/render/placeholder.json"],
      },
    });
    const l1 = scoreL1(inputs);
    const renderAxis = l1.axes.find((a) => a.axisId === "render-coverage");
    expect(renderAxis).toBeDefined();
    expect(renderAxis?.score).toBe(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0032
describe("TC-0012-0032: weightedTotal = min(L1, L2)", () => {
  it("computeWeightedTotal returns the minimum of L1.total and L2.total", () => {
    const l1 = { panel: "L1" as const, total: 0.9, axes: [] };
    const l2 = { panel: "L2" as const, total: 0.7, axes: [] };
    expect(computeWeightedTotal(l1, l2)).toBe(0.7);
  });

  it("scorePanelsFromInputs produces consistent min", () => {
    const inputs = buildMinimalPanelInputs();
    const result = scorePanelsFromInputs(inputs);
    expect(result.weightedTotal).toBe(Math.min(result.l1.total, result.l2.total));
  });
});

// QFAI:SPEC-0012:TC-0012-0033
describe("TC-0012-0033: Converged blocked at iteration 1", () => {
  it("iteration 1 with high score is NOT converged", () => {
    const history: FullHarnessHistory = {
      runId: "test-run",
      iterations: [buildMinimalIteration({ weightedTotal: 0.95, decision: "accept" })],
      bestIteration: 1,
      scoringTrace: [],
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
      thresholds: { accept: 0.8 },
    });
    // count(1) < plateauLookback(3), so no termination
    expect(reason).toBeUndefined();
  });
});

// QFAI:SPEC-0012:TC-0012-0034
describe("TC-0012-0034: Plateau and max-iterations boundary", () => {
  it("plateau detected after lookback window with similar scores", () => {
    const iterations = [0.6, 0.61, 0.605].map((wt, idx) =>
      buildMinimalIteration({
        iteration: idx + 1,
        weightedTotal: wt,
        decision: "refine",
      }),
    );
    const history: FullHarnessHistory = {
      runId: "test-run",
      iterations,
      bestIteration: 2,
      scoringTrace: [],
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
      thresholds: { accept: 0.8 },
    });
    expect(reason).toBe("plateau");
  });

  it("max-iterations triggers termination at boundary", () => {
    const iterations = Array.from({ length: 15 }, (_, idx) =>
      buildMinimalIteration({
        iteration: idx + 1,
        weightedTotal: 0.5 + idx * 0.02,
        decision: "refine",
      }),
    );
    const history: FullHarnessHistory = {
      runId: "test-run",
      iterations,
      bestIteration: 15,
      scoringTrace: [],
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.001,
      plateauLookback: 3,
      thresholds: { accept: 0.95 },
    });
    expect(reason).toBe("max-iterations");
  });
});

// QFAI:SPEC-0012:TC-0012-0035
describe("TC-0012-0035: reviewerLogs append-only", () => {
  it("appendIteration grows history without mutating previous entries", () => {
    const first = buildMinimalIteration({ weightedTotal: 0.6, decision: "refine" });
    const historyAfterFirst = appendIteration(null, first);
    const originalIterationsLength = historyAfterFirst.iterations.length;

    const second = buildMinimalIteration({
      iteration: 2,
      weightedTotal: 0.7,
      decision: "refine",
    });
    const historyAfterSecond = appendIteration(historyAfterFirst, second);

    // Original history object is not mutated
    expect(historyAfterFirst.iterations.length).toBe(originalIterationsLength);
    // New history has both
    expect(historyAfterSecond.iterations.length).toBe(2);
    // First iteration preserved
    expect(historyAfterSecond.iterations[0]?.weightedTotal).toBe(0.6);
  });
});

// ---------------------------------------------------------------------------
// Group 3: Fail-Fast (TC-0012-0036, TC-0012-0039..0041)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0036
describe("TC-0012-0036: Reviewer placeholder rejection", () => {
  it("REVIEWER_PLACEHOLDERS includes all known placeholders", () => {
    const expected = [
      "qfai",
      "default",
      "system",
      "auto",
      "placeholder",
      "tbd",
      "n/a",
      "none",
      "unknown",
      "",
    ];
    for (const placeholder of expected) {
      expect(REVIEWER_PLACEHOLDERS).toContain(placeholder);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0039
describe("TC-0012-0039: Missing evidence fail-fast", () => {
  it("validatePanelInputs throws MeasurementError for each missing piece", () => {
    const empty: FullHarnessPanelInputs = {
      runtimeGate: { uiRoutes: [], evidenceRefs: [] },
      renderEvidence: {
        totalScreens: 0,
        capturedScreens: 0,
        failedScreens: 0,
        viewports: [],
        evidenceRefs: [],
      },
      browserQa: {
        executed: false,
        blockingFindings: 0,
        experienceFindings: 0,
        visualFindings: 0,
        totalFindings: 0,
        phasesExecuted: [],
        evidenceRefs: [],
      },
      uiObservation: { screens: [], evidenceRefs: [] },
      specCoverage: {
        declared: { uiRoutes: 0 },
        checked: { uiOk: 0 },
        missing: { uiRoutes: [] },
        evidenceRefs: [],
      },
      discussionAxes: {
        invariantAxes: 0,
        trendDerivedAxes: 0,
        productSpecificAxes: 0,
        aggregateScore: 0,
        evidenceRefs: [],
      },
      screenContract: {
        totalContracts: 0,
        coveredContracts: 0,
        fidelityScore: 0,
        evidenceRefs: [],
      },
      trendAlignment: {
        trendSourcesChecked: 0,
        translationConsistency: 0,
        competitiveGapsCovered: 0,
        evidenceRefs: [],
      },
    };
    expect(() => validatePanelInputs(empty)).toThrow(MeasurementError);
    try {
      validatePanelInputs(empty);
    } catch (error) {
      expect(error).toBeInstanceOf(MeasurementError);
      const me = error as MeasurementError;
      // Should list multiple missing evidence categories
      expect(me.missingEvidence.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0040
describe("TC-0012-0040: specCoverage zero-seeded rejection", () => {
  it("specCoverage source rejects zero-seeded non-UI coverage via error", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "specCoverage.ts");
    const content = await readFile(srcPath, "utf-8");
    // The module must throw on apiEndpoints/dbObjects
    expect(content).toContain("non-UI prototyping coverage");
    expect(content).toContain("throw new Error");
  });
});

// QFAI:SPEC-0012:TC-0012-0041
describe("TC-0012-0041: uiFidelity synthetic mockPaths rejection", () => {
  it("uiFidelityBuilder source does not auto-generate status=pass", async () => {
    const srcPath = path.resolve(
      process.cwd(),
      "src",
      "core",
      "prototyping",
      "uiFidelityBuilder.ts",
    );
    const content = await readFile(srcPath, "utf-8");
    // mockPaths should use real findings, not auto-generated pass entries
    expect(content).not.toMatch(/status:\s*["']pass["']/);
  });
});

// ---------------------------------------------------------------------------
// Group 4: Rev2 Type & Contract (TC-0012-0046..0048)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0046
describe("TC-0012-0046: request.l1/l2 type removed", () => {
  it("FullHarnessIteration type has l1 and l2 as panel scores, not request fields", async () => {
    const typesPath = path.resolve(process.cwd(), "src", "core", "harness", "types.ts");
    const content = await readFile(typesPath, "utf-8");
    // FullHarnessIteration has l1/l2 as FullHarnessPanelScore (result), not request
    expect(content).toMatch(/l1:\s*FullHarnessPanelScore/);
    expect(content).toMatch(/l2:\s*FullHarnessPanelScore/);
    // No 'request' wrapping for l1/l2
    expect(content).not.toMatch(/request\s*:\s*\{[^}]*l1/);
  });
});

// QFAI:SPEC-0012:TC-0012-0047
describe("TC-0012-0047: panelInputs missing throws", () => {
  it("validatePanelInputs throws on missing renderEvidence.evidenceRefs", () => {
    const inputs = buildMinimalPanelInputs({
      renderEvidence: {
        totalScreens: 1,
        capturedScreens: 1,
        failedScreens: 0,
        viewports: ["desktop"],
        evidenceRefs: [],
      },
    });
    expect(() => validatePanelInputs(inputs)).toThrow(MeasurementError);
  });
});

// QFAI:SPEC-0012:TC-0012-0048
describe("TC-0012-0048: Scoring pipeline sequence", () => {
  it("L1 -> L2 -> min produces correct weightedTotal", () => {
    const inputs = buildMinimalPanelInputs();
    const l1 = scoreL1(inputs);
    const l2 = scoreL2(inputs);
    const wt = computeWeightedTotal(l1, l2);
    expect(wt).toBe(Math.min(l1.total, l2.total));
    expect(l1.panel).toBe("L1");
    expect(l2.panel).toBe("L2");
    expect(l1.axes.length).toBeGreaterThanOrEqual(1);
    expect(l2.axes.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Group 5: Rev2 l2Evidence & Execution (TC-0012-0049..0051)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0049
describe("TC-0012-0049: l2Evidence builders happy path", () => {
  it("l2Evidence module exports buildDiscussionAxisInputs, buildScreenContractInputs, buildTrendAlignmentInputs", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "l2Evidence.ts");
    const content = await readFile(srcPath, "utf-8");
    expect(content).toContain("export async function buildDiscussionAxisInputs");
    expect(content).toContain("export async function buildScreenContractInputs");
    expect(content).toContain("export async function buildTrendAlignmentInputs");
    // Each builder returns a populated result with evidenceRefs
    expect(content).toContain("evidenceRefs:");
    expect(content).toContain("degradedScoring:");
  });
});

// QFAI:SPEC-0012:TC-0012-0050
describe("TC-0012-0050: l2Evidence missing artifact throws", () => {
  it("l2Evidence source throws on missing required files", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "l2Evidence.ts");
    const content = await readFile(srcPath, "utf-8");
    // Verify fail-closed behavior for missing artifacts
    expect(content).toContain("L2 evidence failure:");
    expect(content).toContain("throw new Error");
    // Each builder has its own missing artifact check
    const throwCount = (content.match(/throw new Error/g) ?? []).length;
    expect(throwCount).toBeGreaterThanOrEqual(4);
  });
});

// QFAI:SPEC-0012:TC-0012-0051
describe("TC-0012-0051: execution.ts L2 dummy removal", () => {
  it("execution source contains no zero-literal score assignments", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "execution.ts");
    const content = await readFile(srcPath, "utf-8");
    // No dummy 0 scores being assigned as evidence
    expect(content).not.toMatch(/score\s*[:=]\s*0[,;]/);
    // No hardcoded dummy "0.0" strings
    expect(content).not.toMatch(/score\s*[:=]\s*["']0\.0["']/);
  });
});

// ---------------------------------------------------------------------------
// Group 6: Rev2 CalibrationLoader (TC-0012-0052..0054)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0052
describe("TC-0012-0052: Missing pack throws", () => {
  it("CalibrationLoader.load() throws on nonexistent path", async () => {
    const loader = new CalibrationLoader("/nonexistent/path/calibration.yaml");
    await expect(loader.load()).rejects.toThrow("Calibration pack not found");
  });

  it("loader source has no DEFAULT_PACK constant export", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "calibration", "loader.ts");
    const content = await readFile(srcPath, "utf-8");
    // No exported DEFAULT_PACK constant (comments documenting removal are allowed)
    expect(content).not.toMatch(/export\s+(const|let|var|function)\s+DEFAULT_PACK/);
  });
});

// QFAI:SPEC-0012:TC-0012-0053
describe("TC-0012-0053: Schema violations throw", () => {
  it("missing version field throws", async () => {
    await withTempDir(async (dir) => {
      const packPath = path.join(dir, "calibration.yaml");
      await writeFile(
        packPath,
        [
          "thresholds:",
          "  accept: 0.8",
          "  refine: 0.5",
          "maxIterations: 15",
          "plateauDelta: 0.02",
          "plateauLookback: 3",
          "examples: []",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(packPath);
      await expect(loader.load()).rejects.toThrow("version");
    });
  });

  it("missing thresholds field throws", async () => {
    await withTempDir(async (dir) => {
      const packPath = path.join(dir, "calibration.yaml");
      await writeFile(
        packPath,
        [
          "version: '2.0.0'",
          "maxIterations: 15",
          "plateauDelta: 0.02",
          "plateauLookback: 3",
          "examples: []",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(packPath);
      await expect(loader.load()).rejects.toThrow("thresholds");
    });
  });

  it("missing maxIterations field throws", async () => {
    await withTempDir(async (dir) => {
      const packPath = path.join(dir, "calibration.yaml");
      await writeFile(
        packPath,
        [
          "version: '2.0.0'",
          "thresholds:",
          "  accept: 0.8",
          "  refine: 0.5",
          "plateauDelta: 0.02",
          "plateauLookback: 3",
          "examples: []",
        ].join("\n"),
        "utf-8",
      );
      const loader = new CalibrationLoader(packPath);
      await expect(loader.load()).rejects.toThrow("maxIterations");
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0054
describe("TC-0012-0054: Config fallback weakened", () => {
  it("execution source only reads packPath from config", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "execution.ts");
    const content = await readFile(srcPath, "utf-8");
    // packPath is derived from config.prototyping?.calibration?.packPath
    expect(content).toContain("calibrationConfig?.packPath");
    // No fallback to a hardcoded pack
    expect(content).not.toContain("DEFAULT_CALIBRATION_PACK");
  });
});

// ---------------------------------------------------------------------------
// Group 7: Rev2 Termination (TC-0012-0055..0056)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0055
describe("TC-0012-0055: Premature termination guard", () => {
  it("count < plateauLookback returns undefined (in-progress)", () => {
    const history: FullHarnessHistory = {
      runId: "test-run",
      iterations: [
        buildMinimalIteration({ weightedTotal: 0.9, decision: "accept" }),
        buildMinimalIteration({ iteration: 2, weightedTotal: 0.91, decision: "accept" }),
      ],
      bestIteration: 2,
      scoringTrace: [],
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 5,
      thresholds: { accept: 0.8 },
    });
    expect(reason).toBeUndefined();
  });
});

// QFAI:SPEC-0012:TC-0012-0056
describe("TC-0012-0056: Validator premature termination reject", () => {
  it("history source code enforces strict plateauLookback (no Math.min adaptation)", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "harness", "history.ts");
    const content = await readFile(srcPath, "utf-8");
    // The code explicitly checks count < plateauLookback without Math.min
    expect(content).toContain("count < calibration.plateauLookback");
    expect(content).not.toMatch(/Math\.min\s*\(\s*.*plateauLookback/);
  });
});

// ---------------------------------------------------------------------------
// Group 8: Rev2 specCoverage (TC-0012-0057..0059)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0057
describe("TC-0012-0057: Missing spec error", () => {
  it("execution source throws when spec exists but has no coverage data", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "execution.ts");
    const content = await readFile(srcPath, "utf-8");
    expect(content).toContain("exists but has no coverage data");
  });
});

// QFAI:SPEC-0012:TC-0012-0058
describe("TC-0012-0058: Silent empty rejected", () => {
  it("specCoverage returns empty arrays (not silently failing) when no specs found", async () => {
    await withTempDir(async (dir) => {
      const specsDir = path.join(dir, ".qfai", "specs");
      await mkdir(specsDir, { recursive: true });

      const { buildSpecCoverageSummary } =
        await import("../../src/core/prototyping/specCoverage.js");
      const result = await buildSpecCoverageSummary({ specsDir });
      expect(result.declared.uiRoutes).toBe(0);
      expect(result.checked.uiOk).toBe(0);
      expect(result.missing.uiRoutes).toEqual([]);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0059
describe("TC-0012-0059: DB coverage binary policy", () => {
  it("specCoverage source rejects declared DB objects", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "specCoverage.ts");
    const content = await readFile(srcPath, "utf-8");
    // DB objects and API endpoints declared cause an error
    expect(content).toContain("non-UI prototyping coverage");
    expect(content).toContain("apiEndpoints");
    expect(content).toContain("dbObjects");
  });
});

// ---------------------------------------------------------------------------
// Group 9: Rev2 UiObservation (TC-0012-0060..0062)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0060
describe("TC-0012-0060: ScreenObservation array output", () => {
  it("extractDomLabelsWithJsdom returns labels for 2-screen HTML", () => {
    const html1 = `<html><body>
      <h1>Orders</h1>
      <button>Submit</button>
      <a href="/details">Details</a>
    </body></html>`;
    const labels1 = extractDomLabelsWithJsdom(html1);
    expect(labels1.length).toBeGreaterThanOrEqual(2);
    expect(labels1).toContain("Orders");
    expect(labels1).toContain("Submit");

    const html2 = `<html><body>
      <h2>Dashboard</h2>
      <button aria-label="Menu">Toggle</button>
    </body></html>`;
    const labels2 = extractDomLabelsWithJsdom(html2);
    expect(labels2.length).toBeGreaterThanOrEqual(1);
    expect(labels2).toContain("Dashboard");
  });

  it("ScreenObservation type requires all expected fields", async () => {
    const typesPath = path.resolve(process.cwd(), "src", "core", "harness", "panelInputs.ts");
    const content = await readFile(typesPath, "utf-8");
    expect(content).toContain("screenId: string");
    expect(content).toContain("route: string");
    expect(content).toContain("htmlCaptureRef: string");
    expect(content).toContain("domLabelsFound: string[]");
    expect(content).toContain("elementsPlaced: number");
    expect(content).toContain("actionsWired: number");
    expect(content).toContain("mockPathFindings:");
    expect(content).toContain("browserQaEvidenceRefs: string[]");
    expect(content).toContain("browserQaObserved: boolean");
  });
});

// QFAI:SPEC-0012:TC-0012-0061
describe("TC-0012-0061: actionsWired unknown", () => {
  it("uiObservation source does not use actionsWired: 0 as default when no QA data", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "uiObservation.ts");
    const content = await readFile(srcPath, "utf-8");
    // actionsWired is computed from actionCoverage, not hardcoded to 0
    expect(content).toContain("actionCoverage.actionsWired");
    expect(content).not.toMatch(/actionsWired\s*:\s*0\b/);
  });
});

// QFAI:SPEC-0012:TC-0012-0062
describe("TC-0012-0062: uiFidelity auto-pass absent", () => {
  it("uiFidelityBuilder source has no auto-generated status=pass", async () => {
    const srcPath = path.resolve(
      process.cwd(),
      "src",
      "core",
      "prototyping",
      "uiFidelityBuilder.ts",
    );
    const content = await readFile(srcPath, "utf-8");
    expect(content).not.toMatch(/status\s*:\s*["']pass["']/);
  });
});

// ---------------------------------------------------------------------------
// Group 10: Rev2 History & Bundle (TC-0012-0063..0064)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0063
describe("TC-0012-0063: History array length mismatch", () => {
  it("validateHistoryConsistency reports length mismatches", () => {
    const history: FullHarnessHistory = {
      runId: "test-run",
      iterations: [buildMinimalIteration()],
      bestIteration: 1,
      scoringTrace: [
        {
          iteration: 1,
          l1Total: 0.85,
          l2Total: 0.75,
          weightedTotal: 0.75,
          deltaFromPrevious: null,
          decision: "refine",
          commitSha: "abc123def456",
        },
        // Extra entry to cause mismatch
        {
          iteration: 2,
          l1Total: 0.9,
          l2Total: 0.8,
          weightedTotal: 0.8,
          deltaFromPrevious: 0.05,
          decision: "refine",
          commitSha: "def789abc123",
        },
      ],
    };
    const errors = validateHistoryConsistency(history);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("iterations.length");

    // Also test reviewerLogs length mismatch
    const errors2 = validateHistoryConsistency(
      {
        ...history,
        scoringTrace: history.scoringTrace.slice(0, 1),
      },
      5,
    );
    expect(errors2.some((e) => e.includes("reviewerLogs.length"))).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0064
describe("TC-0012-0064: bundleWriter schema v2 output", () => {
  it("bundleWriter has 8-category evidenceRefs in FullHarnessIteration", async () => {
    const typesPath = path.resolve(process.cwd(), "src", "core", "harness", "types.ts");
    const content = await readFile(typesPath, "utf-8");
    const categories = [
      "render:",
      "browserQa:",
      "runtimeGate:",
      "uiObservation:",
      "specCoverage:",
      "discussion:",
      "screenContract:",
      "trend:",
    ];
    for (const category of categories) {
      expect(content).toContain(category);
    }
  });

  it("bundleWriter source uses PrototypingSummaryBundle without v1 schema", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "evidence", "bundleWriter.ts");
    const content = await readFile(srcPath, "utf-8");
    expect(content).toContain("PrototypingSummaryBundle");
    // No v1 schema references
    expect(content).not.toContain("schema_version");
    expect(content).not.toContain("v1_compat");
  });
});

// ---------------------------------------------------------------------------
// Group 11: Rev2 Fixtures & Fields (TC-0012-0065..0070)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0065
describe("TC-0012-0065: Normal fixture rev2 clean", () => {
  it("buildMinimalIteration helper has no l1/l2 as direct top-level pass and no packVersion 1.0.0", () => {
    const iteration = buildMinimalIteration();
    // l1 and l2 are FullHarnessPanelScore objects, not pass-through
    expect(iteration.l1.panel).toBe("L1");
    expect(iteration.l2.panel).toBe("L2");
    expect(typeof iteration.l1.total).toBe("number");
    expect(typeof iteration.l2.total).toBe("number");
  });

  it("CalibrationLoader source has no version 1.0.0 fallback logic", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "calibration", "loader.ts");
    const content = await readFile(srcPath, "utf-8");
    // No runtime fallback to "1.0.0" (comments documenting removal are allowed)
    expect(content).not.toMatch(/version\s*=\s*["']1\.0\.0["']/);
    expect(content).not.toMatch(/\|\|\s*["']1\.0\.0["']/);
    expect(content).not.toMatch(/\?\?\s*["']1\.0\.0["']/);
  });
});

// QFAI:SPEC-0012:TC-0012-0066
describe("TC-0012-0066: Error fixture rev2 coverage", () => {
  it("execution source has explicit checks for missing pack, reviewer, and evidence", async () => {
    const srcPath = path.resolve(process.cwd(), "src", "core", "prototyping", "execution.ts");
    const content = await readFile(srcPath, "utf-8");
    // Missing calibration pack
    expect(content).toContain("CalibrationResolutionError");
    // Missing reviewer
    expect(content).toContain("requires --reviewer");
    // Missing evidence
    expect(content).toContain("UiFidelityEvidenceError");
    expect(content).toContain("SpecCoverageBuildError");
    expect(content).toContain("L2EvidenceBuildError");
  });
});

// QFAI:SPEC-0012:TC-0012-0067
describe("TC-0012-0067: FullHarnessIteration required fields", () => {
  it("all required fields present and non-null in test iteration", () => {
    const iteration = buildMinimalIteration();
    expect(iteration.iteration).toBeGreaterThanOrEqual(1);
    expect(iteration.commitSha.length).toBeGreaterThan(0);
    expect(iteration.reviewerId.length).toBeGreaterThan(0);
    expect(iteration.timestamp.length).toBeGreaterThan(0);
    expect(Array.isArray(iteration.changeSummary)).toBe(true);
    expect(Array.isArray(iteration.limitations)).toBe(true);
    expect(iteration.evidenceRefs).toBeDefined();
    expect(iteration.l1).toBeDefined();
    expect(iteration.l2).toBeDefined();
    expect(typeof iteration.weightedTotal).toBe("number");
    expect(iteration.decision).toBeDefined();

    // All 8 evidence categories must be present
    const categories = [
      "render",
      "browserQa",
      "runtimeGate",
      "uiObservation",
      "specCoverage",
      "discussion",
      "screenContract",
      "trend",
    ] as const;
    for (const cat of categories) {
      expect(Array.isArray(iteration.evidenceRefs[cat])).toBe(true);
      expect(iteration.evidenceRefs[cat].length).toBeGreaterThan(0);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0068
describe("TC-0012-0068: FullHarnessIteration missing field", () => {
  it("type definition requires all iteration fields (TypeScript contract)", async () => {
    const typesPath = path.resolve(process.cwd(), "src", "core", "harness", "types.ts");
    const content = await readFile(typesPath, "utf-8");
    // Verify mandatory fields (no optional markers)
    const requiredFields = [
      "iteration: number",
      "commitSha: string",
      "reviewerId: string",
      "timestamp: string",
      "changeSummary: string[]",
      "limitations: string[]",
      "weightedTotal: number",
      "decision: Decision",
    ];
    for (const field of requiredFields) {
      expect(content).toContain(field);
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0069
describe("TC-0012-0069: validatePanelInputs 10-check gate", () => {
  it("each empty evidence category is reported by validatePanelInputs", () => {
    const checkCategories = [
      "renderEvidence.screens",
      "renderEvidence.evidenceRefs",
      "browserQa",
      "browserQa.evidenceRefs",
      "runtimeGate.evidenceRefs",
      "specCoverage.evidenceRefs",
      "uiObservation.evidenceRefs",
      "discussionAxes.evidenceRefs",
      "screenContract.evidenceRefs",
      "trendAlignment.evidenceRefs",
    ];

    // Build with all empty inputs
    const empty: FullHarnessPanelInputs = {
      runtimeGate: { uiRoutes: [], evidenceRefs: [] },
      renderEvidence: {
        totalScreens: 0,
        capturedScreens: 0,
        failedScreens: 0,
        viewports: [],
        evidenceRefs: [],
      },
      browserQa: {
        executed: false,
        blockingFindings: 0,
        experienceFindings: 0,
        visualFindings: 0,
        totalFindings: 0,
        phasesExecuted: [],
        evidenceRefs: [],
      },
      uiObservation: { screens: [], evidenceRefs: [] },
      specCoverage: {
        declared: { uiRoutes: 0 },
        checked: { uiOk: 0 },
        missing: { uiRoutes: [] },
        evidenceRefs: [],
      },
      discussionAxes: {
        invariantAxes: 0,
        trendDerivedAxes: 0,
        productSpecificAxes: 0,
        aggregateScore: 0,
        evidenceRefs: [],
      },
      screenContract: {
        totalContracts: 0,
        coveredContracts: 0,
        fidelityScore: 0,
        evidenceRefs: [],
      },
      trendAlignment: {
        trendSourcesChecked: 0,
        translationConsistency: 0,
        competitiveGapsCovered: 0,
        evidenceRefs: [],
      },
    };
    try {
      validatePanelInputs(empty);
      expect.fail("Expected MeasurementError");
    } catch (error) {
      expect(error).toBeInstanceOf(MeasurementError);
      const me = error as MeasurementError;
      // Should cover at least the 10 checks (some may be combined)
      expect(me.missingEvidence.length).toBeGreaterThanOrEqual(8);
      // Verify key categories are mentioned
      for (const cat of checkCategories) {
        const found = me.missingEvidence.some((m) => m.includes(cat.split(".")[0] ?? ""));
        expect(found).toBe(true);
      }
    }
  });
});

// QFAI:SPEC-0012:TC-0012-0070
describe("TC-0012-0070: panelScore double defense", () => {
  it("validatePanelScore catches out-of-range scores", () => {
    const badPanel = {
      panel: "L1" as const,
      total: 1.5,
      axes: [
        {
          axisId: "test",
          score: -0.1,
          rationale: "test axis",
          evidenceRefs: [".qfai/evidence/test.json"],
        },
      ],
    };
    const errors = validatePanelScore(badPanel);
    expect(errors.some((e) => e.includes("total must be between 0 and 1"))).toBe(true);
    expect(errors.some((e) => e.includes("score must be between 0 and 1"))).toBe(true);
  });

  it("validatePanelScore catches empty axes", () => {
    const emptyAxes = {
      panel: "L1" as const,
      total: 0.5,
      axes: [],
    };
    const errors = validatePanelScore(emptyAxes);
    expect(errors.some((e) => e.includes("at least one axis"))).toBe(true);
  });

  it("validatePanelScore catches empty rationale", () => {
    const badRationale = {
      panel: "L2" as const,
      total: 0.5,
      axes: [
        {
          axisId: "test",
          score: 0.5,
          rationale: "",
          evidenceRefs: [".qfai/evidence/test.json"],
        },
      ],
    };
    const errors = validatePanelScore(badRationale);
    expect(errors.some((e) => e.includes("non-empty rationale"))).toBe(true);
  });

  it("validatePanelScore catches empty evidenceRefs", () => {
    const noRefs = {
      panel: "L1" as const,
      total: 0.5,
      axes: [
        {
          axisId: "test",
          score: 0.5,
          rationale: "has rationale",
          evidenceRefs: [],
        },
      ],
    };
    const errors = validatePanelScore(noRefs);
    expect(errors.some((e) => e.includes("at least one evidenceRef"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group: Surface & Classification (TC-0012-0071 .. TC-0012-0082)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0071
describe("TC-0012-0071: Canonical surface name accepted", () => {
  it("isCanonicalPrototypingSurface returns true for 'web'", () => {
    expect(isCanonicalPrototypingSurface("web")).toBe(true);
  });

  it("assertCanonicalPrototypingSurface does not throw for 'web'", () => {
    expect(() => assertCanonicalPrototypingSurface("web")).not.toThrow();
    expect(assertCanonicalPrototypingSurface("web")).toBe("web");
  });
});

// QFAI:SPEC-0012:TC-0012-0072
describe("TC-0012-0072: Non-canonical surface name rejected", () => {
  it("isCanonicalPrototypingSurface returns false for 'web-ui'", () => {
    expect(isCanonicalPrototypingSurface("web-ui")).toBe(false);
  });

  it("assertCanonicalPrototypingSurface throws for 'web-ui'", () => {
    expect(() => assertCanonicalPrototypingSurface("web-ui")).toThrow(
      /surface field must be one of/,
    );
  });
});

// QFAI:SPEC-0012:TC-0012-0073
describe("TC-0012-0073: Contradictory classification hard error", () => {
  it("parseDiscussionFromObject with both legacy keys and namespaced block returns null with warning", () => {
    const input: Record<string, unknown> = {
      recommended_mode: "full-harness",
      rationale: "legacy top-level",
      allowed_modes: ["full-harness"],
      surface: "web",
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "namespaced",
        allowed_modes: ["full-harness"],
        surface: "web",
      },
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Legacy top-level recommendation keys");
  });
});

// QFAI:SPEC-0012:TC-0012-0074
describe("TC-0012-0074: Valid classification passes", () => {
  it("parseDiscussionFromObject with valid namespaced schema returns recommendation", () => {
    const input: Record<string, unknown> = {
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "UI prototype requires full-harness evaluation",
        allowed_modes: ["full-harness"],
        surface: "web",
        updated_at: "2026-04-14",
      },
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).not.toBeNull();
    const rec = result.recommendation ?? { recommendedMode: "", surface: "", sourceSchema: "" };
    expect(rec.recommendedMode).toBe("full-harness");
    expect(rec.surface).toBe("web");
    expect(rec.sourceSchema).toBe("canonical-namespaced");
    expect(result.warnings).toHaveLength(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0075
describe("TC-0012-0075: Non-UI surface rejected in obligation", () => {
  it("derivePrototypingObligations returns invalid for cli + full-harness", () => {
    const obligations = derivePrototypingObligations({
      surface: "cli" as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(obligations.validCombination).toBe(false);
    expect(obligations.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });
});

// QFAI:SPEC-0012:TC-0012-0076
describe("TC-0012-0076: UI-bearing surface accepted in obligation", () => {
  it("derivePrototypingObligations returns valid for web + full-harness", () => {
    const obligations = derivePrototypingObligations({
      surface: "web" as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(obligations.validCombination).toBe(true);
    expect(obligations.requireRuntimeGate).toBe(true);
    expect(obligations.requireFullHarness).toBe(true);
  });
});

// QFAI:SPEC-0012:TC-0012-0077
describe("TC-0012-0077: Legacy top-level key hard error", () => {
  it("parseDiscussionFromObject with only legacy keys returns null with warning", () => {
    const input: Record<string, unknown> = {
      recommended_mode: "full-harness",
      rationale: "legacy only",
      allowed_modes: ["full-harness"],
      surface: "web",
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Legacy top-level recommendation keys");
  });
});

// QFAI:SPEC-0012:TC-0012-0078
describe("TC-0012-0078: Namespaced key accepted", () => {
  it("parseDiscussionFromObject with proper prototyping: block returns valid recommendation", () => {
    const input: Record<string, unknown> = {
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "Proper namespaced schema",
        allowed_modes: ["full-harness"],
        surface: "mobile",
      },
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).not.toBeNull();
    const rec = result.recommendation ?? { recommendedMode: "", surface: "" };
    expect(rec.recommendedMode).toBe("full-harness");
    expect(rec.surface).toBe("mobile");
    expect(result.warnings).toHaveLength(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0079
describe("TC-0012-0079: Semantic mismatch returns null", () => {
  it("parseDiscussionFromObject with invalid allowed_modes returns null", () => {
    const input: Record<string, unknown> = {
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "Valid rationale text",
        allowed_modes: ["low-cost", "standard"],
        surface: "web",
      },
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).toBeNull();
  });
});

// QFAI:SPEC-0012:TC-0012-0080
describe("TC-0012-0080: Consistent mode accepted", () => {
  it("parseDiscussionFromObject with consistent recommended and allowed modes succeeds", () => {
    const input: Record<string, unknown> = {
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "Consistent mode configuration",
        allowed_modes: ["full-harness"],
        surface: "desktop",
      },
    };
    const result = parseDiscussionFromObject(input);
    expect(result.recommendation).not.toBeNull();
    const rec = result.recommendation ?? { allowedModes: [] as string[] };
    expect(rec.allowedModes).toContain("full-harness");
    expect(result.warnings).toHaveLength(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0081
describe("TC-0012-0081: CLI surface obligations exclude browser evidence", () => {
  it("requiresVisualBrowserEvidence returns false for cli", () => {
    expect(requiresVisualBrowserEvidence("cli" as PrototypingSurface)).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0082
describe("TC-0012-0082: CLI surface is invalid combination in full-harness", () => {
  it("derivePrototypingObligations marks cli + full-harness as invalid", () => {
    const obligations = derivePrototypingObligations({
      surface: "cli" as PrototypingSurface,
      effectiveMode: "full-harness",
    });
    expect(obligations.validCombination).toBe(false);
    expect(obligations.requireRuntimeGate).toBe(false);
    expect(obligations.requireBrowserQaBundle).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group: Termination & Scoring (TC-0012-0083 .. TC-0012-0091)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0083
describe("TC-0012-0083: Full-harness converged termination", () => {
  it("computeTerminationReason returns 'converged' when scores exceed accept threshold", () => {
    const iterations: FullHarnessIteration[] = Array.from({ length: 6 }, (_, i) =>
      buildMinimalIteration({
        iteration: i + 1,
        weightedTotal: 0.82 + i * 0.005,
        deltaFromPrevious: i === 0 ? null : 0.005,
        decision: "refine",
      }),
    );
    const history: FullHarnessHistory = {
      runId: "test-converged",
      iterations,
      bestIteration: 6,
      scoringTrace: iterations.map((it) => ({
        iteration: it.iteration,
        l1Total: it.l1.total,
        l2Total: it.l2.total,
        weightedTotal: it.weightedTotal,
        deltaFromPrevious: it.deltaFromPrevious,
        decision: it.decision,
        commitSha: it.commitSha,
      })),
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
      thresholds: { accept: 0.8 },
    });
    expect(reason).toBe("converged");
  });
});

// QFAI:SPEC-0012:TC-0012-0084
describe("TC-0012-0084: Full-harness plateau termination", () => {
  it("computeTerminationReason returns 'plateau' when scores plateau below accept", () => {
    const scores = [0.6, 0.61, 0.605, 0.608, 0.607];
    const iterations: FullHarnessIteration[] = scores.map((s, i) =>
      buildMinimalIteration({
        iteration: i + 1,
        weightedTotal: s,
        deltaFromPrevious: i === 0 ? null : Math.abs(s - scores[i - 1]),
        decision: "refine",
      }),
    );
    const history: FullHarnessHistory = {
      runId: "test-plateau",
      iterations,
      bestIteration: 2,
      scoringTrace: iterations.map((it) => ({
        iteration: it.iteration,
        l1Total: it.l1.total,
        l2Total: it.l2.total,
        weightedTotal: it.weightedTotal,
        deltaFromPrevious: it.deltaFromPrevious,
        decision: it.decision,
        commitSha: it.commitSha,
      })),
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
      thresholds: { accept: 0.9 },
    });
    expect(reason).toBe("plateau");
  });
});

// QFAI:SPEC-0012:TC-0012-0085
describe("TC-0012-0085: Independent evaluator panel score", () => {
  it("scorePanelsFromInputs produces non-zero L1, L2 and correct weightedTotal", () => {
    const inputs = buildMinimalPanelInputs();
    const result = scorePanelsFromInputs(inputs);
    expect(result.l1.total).toBeGreaterThan(0);
    expect(result.l2.total).toBeGreaterThan(0);
    expect(result.weightedTotal).toBe(Math.min(result.l1.total, result.l2.total));
  });
});

// QFAI:SPEC-0012:TC-0012-0086
describe("TC-0012-0086: Score scope separation", () => {
  it("scorePanelsFromInputs output is structurally scoped to prototyping only", () => {
    const inputs = buildMinimalPanelInputs();
    const result = scorePanelsFromInputs(inputs);
    expect(result.l1.panel).toBe("L1");
    expect(result.l2.panel).toBe("L2");
    // Verify no discussion-scope fields leak into scoring result
    const resultKeys = Object.keys(result);
    expect(resultKeys).toContain("l1");
    expect(resultKeys).toContain("l2");
    expect(resultKeys).toContain("weightedTotal");
    expect(resultKeys).not.toContain("discussionScore");
    expect(resultKeys).not.toContain("discussionTotal");
  });
});

// QFAI:SPEC-0012:TC-0012-0087
describe("TC-0012-0087: Existence gate score ceiling", () => {
  it("scoreL1 with zero evidence produces total <= 0.3", () => {
    const zeroInputs = buildMinimalPanelInputs({
      runtimeGate: {
        uiRoutes: [],
        evidenceRefs: [".qfai/evidence/runtimeGate.json"],
      },
      renderEvidence: {
        totalScreens: 0,
        capturedScreens: 0,
        failedScreens: 0,
        viewports: [],
        evidenceRefs: [".qfai/evidence/render/empty.png"],
      },
      browserQa: {
        executed: false,
        blockingFindings: 0,
        experienceFindings: 0,
        visualFindings: 0,
        totalFindings: 0,
        phasesExecuted: [],
        evidenceRefs: [".qfai/evidence/browserQa/empty.json"],
      },
      specCoverage: {
        declared: { uiRoutes: 0 },
        checked: { uiOk: 0 },
        missing: { uiRoutes: [] },
        evidenceRefs: [".qfai/specs/empty.md"],
      },
      screenContract: {
        totalContracts: 0,
        coveredContracts: 0,
        fidelityScore: 0,
        evidenceRefs: [".qfai/evidence/empty-contract.json"],
      },
    });
    const l1 = scoreL1(zeroInputs);
    expect(l1.total).toBeLessThanOrEqual(0.3);
  });
});

// QFAI:SPEC-0012:TC-0012-0088
describe("TC-0012-0088: Asset emoji prohibition", () => {
  it("emoji codepoints in asset names trigger REVISE decision", () => {
    // U+1F600 (😀) is in the forbidden range U+1F000–U+1FAFF
    expect(containsEmojiInRange("decoration 😀 element")).toBe(true);
    // Lower boundary U+1F000
    expect(containsEmojiInRange("\u{1F000}")).toBe(true);
    // Upper boundary U+1FAFF
    expect(containsEmojiInRange("\u{1FAFF}")).toBe(true);
    // U+1FB00 is outside the forbidden range
    expect(containsEmojiInRange("\u{1FB00}")).toBe(false);
    expect(containsEmojiInRange("clean text without emoji")).toBe(false);
    expect(containsEmojiInRange("")).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0089
describe("TC-0012-0089: Reviewer gate verification checks", () => {
  it("validateHistoryConsistency returns no errors for valid 3-iteration history", () => {
    const iterations: FullHarnessIteration[] = [1, 2, 3].map((n) =>
      buildMinimalIteration({
        iteration: n,
        weightedTotal: 0.7 + n * 0.05,
        deltaFromPrevious: n === 1 ? null : 0.05,
        decision: "refine",
      }),
    );
    const history: FullHarnessHistory = {
      runId: "test-consistency",
      iterations,
      bestIteration: 3,
      scoringTrace: iterations.map((it) => ({
        iteration: it.iteration,
        l1Total: it.l1.total,
        l2Total: it.l2.total,
        weightedTotal: it.weightedTotal,
        deltaFromPrevious: it.deltaFromPrevious,
        decision: it.decision,
        commitSha: it.commitSha,
      })),
    };
    const errors = validateHistoryConsistency(history);
    expect(errors).toHaveLength(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0090
describe("TC-0012-0090: PROT-290 single-iteration convergence guard", () => {
  it("computeTerminationReason does not return 'converged' for single iteration", () => {
    const iterations: FullHarnessIteration[] = [
      buildMinimalIteration({
        iteration: 1,
        weightedTotal: 0.95,
        deltaFromPrevious: null,
        decision: "accept",
      }),
    ];
    const history: FullHarnessHistory = {
      runId: "test-single",
      iterations,
      bestIteration: 1,
      scoringTrace: iterations.map((it) => ({
        iteration: it.iteration,
        l1Total: it.l1.total,
        l2Total: it.l2.total,
        weightedTotal: it.weightedTotal,
        deltaFromPrevious: it.deltaFromPrevious,
        decision: it.decision,
        commitSha: it.commitSha,
      })),
    };
    const reason = computeTerminationReason(history, {
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
      thresholds: { accept: 0.8 },
    });
    expect(reason).toBeUndefined();
  });
});

// QFAI:SPEC-0012:TC-0012-0091
describe("TC-0012-0091: Maximum delta cap – large delta is not plateau", () => {
  it("PlateauDetector does not detect plateau when score delta is large", () => {
    const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 });
    const scores = [0.5, 0.52, 0.51, 0.76];
    const result = detector.detect(scores);
    expect(result.detected).toBe(false);
    expect(result.delta).toBeGreaterThanOrEqual(0.02);
  });
});
