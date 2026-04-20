import { describe, expect, it } from "vitest";

import {
  computeWeightedTotal,
  determineDecision,
  validatePanelScore,
  scoreL1,
  scoreL2,
  scorePanelsFromInputs,
} from "../../../src/core/harness/panelScore.js";
import type { FullHarnessPanelScore } from "../../../src/core/harness/types.js";
import type { FullHarnessPanelInputs } from "../../../src/core/harness/panelInputs.js";

const RENDER_REF = ".qfai/evidence/render.json#/screens/dashboard";
const BROWSER_QA_REF = ".qfai/evidence/browser-qa.json#/screens/dashboard";
const RUNTIME_GATE_REF = ".qfai/evidence/runtime-gate.json#/gate";
const SCREEN_CONTRACT_REF = ".qfai/discussion/pack-1/uiux/40_screen_contracts.md#dashboard";
const SPEC_COV_REF = ".qfai/evidence/spec-coverage.json#/coverage";
const DISCUSSION_REF = ".qfai/discussion/pack-1/uiux/20_design_eval_invariant.md#L12";
const TREND_REF = ".qfai/discussion/pack-1/04_Sources.md#L8";
const HTML_REF = ".qfai/evidence/render/dashboard.desktop.html";

function panelWithAxis(
  overrides: Partial<FullHarnessPanelScore["axes"][number]> = {},
): FullHarnessPanelScore {
  return {
    panel: "L1",
    total: 0.75,
    axes: [
      {
        axisId: "AX-001",
        score: 0.75,
        rationale: "Valid rationale",
        evidenceRefs: [RENDER_REF],
        ...overrides,
      },
    ],
  };
}

describe("computeWeightedTotal", () => {
  it("returns min(l1.total, l2.total)", () => {
    const l1: FullHarnessPanelScore = { panel: "L1", total: 0.8, axes: [] };
    const l2: FullHarnessPanelScore = { panel: "L2", total: 0.6, axes: [] };
    expect(computeWeightedTotal(l1, l2)).toBe(0.6);
  });

  it("returns l1 when l1 < l2", () => {
    const l1: FullHarnessPanelScore = { panel: "L1", total: 0.3, axes: [] };
    const l2: FullHarnessPanelScore = { panel: "L2", total: 0.9, axes: [] };
    expect(computeWeightedTotal(l1, l2)).toBe(0.3);
  });
});

describe("determineDecision", () => {
  const thresholds = { accept: 0.8, refine: 0.5 };

  it("returns accept when >= accept threshold", () => {
    expect(determineDecision(0.8, thresholds)).toBe("accept");
    expect(determineDecision(0.9, thresholds)).toBe("accept");
  });

  it("returns refine when >= refine threshold but < accept", () => {
    expect(determineDecision(0.5, thresholds)).toBe("refine");
    expect(determineDecision(0.7, thresholds)).toBe("refine");
  });

  it("returns reject when below refine threshold", () => {
    expect(determineDecision(0.3, thresholds)).toBe("reject");
    expect(determineDecision(0.0, thresholds)).toBe("reject");
  });
});

describe("validatePanelScore (rev11 strict)", () => {
  it("returns no errors for a fully-valid panel", () => {
    expect(validatePanelScore(panelWithAxis())).toHaveLength(0);
  });

  it("rejects total outside 0-1 range", () => {
    const panel: FullHarnessPanelScore = {
      ...panelWithAxis(),
      total: 1.5,
    };
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /total must be between 0 and 1/.test(e))).toBe(true);
  });

  it("rejects empty axes", () => {
    const panel: FullHarnessPanelScore = { panel: "L1", total: 0.5, axes: [] };
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /at least one axis/.test(e))).toBe(true);
  });

  it("rejects axis score outside 0-1 range", () => {
    const panel = panelWithAxis({ score: -0.1 });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /score must be between 0 and 1/.test(e))).toBe(true);
  });

  it("rejects empty rationale", () => {
    const panel = panelWithAxis({ rationale: "" });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /non-empty rationale/.test(e))).toBe(true);
  });

  it("rejects empty evidenceRefs", () => {
    const panel = panelWithAxis({ evidenceRefs: [] });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /at least one evidenceRef/.test(e))).toBe(true);
  });

  it("rejects malformed evidenceRef (bare filename)", () => {
    const panel = panelWithAxis({ evidenceRefs: ["render/home.png"] });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /not a concrete artifact ref/.test(e))).toBe(true);
  });

  it("rejects absolute path evidenceRef", () => {
    const panel = panelWithAxis({ evidenceRefs: ["/abs/render.json#/screens/0"] });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /not a concrete artifact ref/.test(e))).toBe(true);
  });

  it("rejects synthetic token evidenceRef", () => {
    const panel = panelWithAxis({ evidenceRefs: ["specs:foo"] });
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => /not a concrete artifact ref/.test(e))).toBe(true);
  });
});

function makePanelInputs(overrides: Partial<FullHarnessPanelInputs> = {}): FullHarnessPanelInputs {
  return {
    runtimeGate: {
      uiRoutes: [
        {
          screenId: "dashboard",
          route: "/dashboard",
          rendered: true,
          browserVisited: true,
          renderEvidenceRefs: [RENDER_REF],
          browserQaEvidenceRefs: [BROWSER_QA_REF],
        },
      ],
      evidenceRefs: [RUNTIME_GATE_REF],
    },
    renderEvidence: {
      totalScreens: 2,
      capturedScreens: 2,
      failedScreens: 0,
      viewports: ["desktop", "mobile"],
      evidenceRefs: [RENDER_REF],
    },
    browserQa: {
      executed: true,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: ["smoke", "interaction"],
      evidenceRefs: [BROWSER_QA_REF],
    },
    uiObservation: {
      screens: [
        {
          screenId: "dashboard",
          route: "/dashboard",
          htmlCaptureRef: HTML_REF,
          domLabelsFound: ["Dashboard"],
          elementsPlaced: 1,
          actionsWired: 1,
          mockPathFindings: [],
          browserQaEvidenceRefs: [BROWSER_QA_REF],
          browserQaObserved: true,
        },
      ],
      evidenceRefs: [HTML_REF],
    },
    specCoverage: {
      declared: { uiRoutes: 1 },
      checked: { uiOk: 1 },
      missing: { uiRoutes: [] },
      evidenceRefs: [SPEC_COV_REF],
    },
    discussionAxes: {
      invariantAxes: 3,
      trendDerivedAxes: 2,
      productSpecificAxes: 1,
      aggregateScore: 0.8,
      evidenceRefs: [DISCUSSION_REF],
    },
    screenContract: {
      totalContracts: 3,
      coveredContracts: 3,
      fidelityScore: 0.9,
      evidenceRefs: [SCREEN_CONTRACT_REF],
    },
    trendAlignment: {
      trendSourcesChecked: 2,
      translationConsistency: 0.85,
      competitiveGapsCovered: 1,
      evidenceRefs: [TREND_REF],
    },
    ...overrides,
  };
}

describe("scoreL1", () => {
  it("computes L1 with the fixed axis set", () => {
    const result = scoreL1(makePanelInputs());
    expect(result.panel).toBe("L1");
    expect(result.axes.map((a) => a.axisId)).toEqual([
      "runtime-gate",
      "render-coverage",
      "browser-qa-blocking",
      "screen-contract-coverage",
      "spec-coverage",
    ]);
    expect(validatePanelScore(result)).toHaveLength(0);
  });
});

describe("scoreL2", () => {
  it("computes L2 with the fixed axis set", () => {
    const result = scoreL2(makePanelInputs());
    expect(result.panel).toBe("L2");
    expect(result.axes.map((a) => a.axisId)).toEqual([
      "discussion-axes",
      "screen-contract-fidelity",
      "trend-alignment",
      "visual-findings",
      "browser-qa-experience",
    ]);
    expect(validatePanelScore(result)).toHaveLength(0);
  });
});

describe("scorePanelsFromInputs", () => {
  it("returns l1, l2, and weightedTotal = min(l1, l2)", () => {
    const { l1, l2, weightedTotal } = scorePanelsFromInputs(makePanelInputs());
    expect(l1.panel).toBe("L1");
    expect(l2.panel).toBe("L2");
    expect(weightedTotal).toBe(Math.min(l1.total, l2.total));
  });
});
