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

  it("returns same value when equal", () => {
    const l1: FullHarnessPanelScore = { panel: "L1", total: 0.7, axes: [] };
    const l2: FullHarnessPanelScore = { panel: "L2", total: 0.7, axes: [] };
    expect(computeWeightedTotal(l1, l2)).toBe(0.7);
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

describe("validatePanelScore", () => {
  it("returns no errors for valid panel", () => {
    const panel: FullHarnessPanelScore = {
      panel: "L1",
      total: 0.75,
      axes: [
        {
          axisId: "AX-001",
          score: 0.8,
          rationale: "Good accessibility compliance",
          evidenceRefs: ["render/screen1.png"],
        },
      ],
    };
    expect(validatePanelScore(panel)).toHaveLength(0);
  });

  it("rejects total outside 0-1 range", () => {
    const panel: FullHarnessPanelScore = { panel: "L1", total: 1.5, axes: [] };
    const errors = validatePanelScore(panel);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/total must be between 0 and 1/);
  });

  it("rejects axis score outside 0-1 range", () => {
    const panel: FullHarnessPanelScore = {
      panel: "L2",
      total: 0.5,
      axes: [{ axisId: "AX-001", score: -0.1, rationale: "Valid", evidenceRefs: [] }],
    };
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => e.includes("score must be between 0 and 1"))).toBe(true);
  });

  it("rejects empty rationale", () => {
    const panel: FullHarnessPanelScore = {
      panel: "L1",
      total: 0.5,
      axes: [{ axisId: "AX-001", score: 0.5, rationale: "", evidenceRefs: [] }],
    };
    const errors = validatePanelScore(panel);
    expect(errors.some((e) => e.includes("non-empty rationale"))).toBe(true);
  });
});

function makePanelInputs(overrides: Partial<FullHarnessPanelInputs> = {}): FullHarnessPanelInputs {
  return {
    runtimeGate: {
      uiRoutes: [{ route: "/home", status: 200 }],
      apiEndpoints: [{ method: "GET", path: "/api/v1/items", status: 200 }],
    },
    renderEvidence: {
      totalScreens: 2,
      capturedScreens: 2,
      failedScreens: 0,
      viewports: ["desktop", "mobile"],
      evidenceRefs: ["render/home.png"],
    },
    browserQa: {
      executed: true,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: ["smoke", "interaction"],
      evidenceRefs: ["browser-qa.json"],
    },
    uiObservation: {
      domLabelsFound: ["Home", "Orders"],
      elementsPlaced: 10,
      actionsWired: 5,
      htmlCaptureRefs: ["render/home.html"],
    },
    specCoverage: {
      declared: { uiRoutes: 1, apiEndpoints: 1, dbObjects: 0 },
      checked: { uiOk: 1, apiNon404: 1, dbPresent: 0 },
      missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
      evidenceRefs: ["specs/spec-0001"],
    },
    discussionAxes: {
      invariantAxes: 3,
      trendDerivedAxes: 2,
      productSpecificAxes: 1,
      aggregateScore: 0.8,
      evidenceRefs: ["discussion/pack-1"],
    },
    screenContract: {
      totalContracts: 3,
      coveredContracts: 3,
      fidelityScore: 0.9,
      evidenceRefs: ["screen-contract.yaml"],
    },
    trendAlignment: {
      trendSourcesChecked: 2,
      translationConsistency: 0.85,
      competitiveGapsCovered: 1,
      evidenceRefs: ["trends.md"],
    },
    ...overrides,
  };
}

describe("scoreL1", () => {
  it("computes L1 score from evidence inputs", () => {
    const inputs = makePanelInputs();
    const result = scoreL1(inputs);

    expect(result.panel).toBe("L1");
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(1);
    expect(result.axes.length).toBe(5);
    expect(result.axes.map((a) => a.axisId)).toEqual([
      "runtime-gate",
      "render-coverage",
      "browser-qa-blocking",
      "screen-contract-coverage",
      "spec-coverage",
    ]);
  });

  it("penalizes blocking browser QA findings", () => {
    const clean = scoreL1(
      makePanelInputs({ browserQa: { ...makePanelInputs().browserQa, blockingFindings: 0 } }),
    );
    const dirty = scoreL1(
      makePanelInputs({ browserQa: { ...makePanelInputs().browserQa, blockingFindings: 3 } }),
    );

    const cleanBqaAxis = clean.axes.find((a) => a.axisId === "browser-qa-blocking");
    const dirtyBqaAxis = dirty.axes.find((a) => a.axisId === "browser-qa-blocking");
    expect(cleanBqaAxis).toBeDefined();
    expect(dirtyBqaAxis).toBeDefined();
    expect(cleanBqaAxis?.score).toBeGreaterThan(dirtyBqaAxis?.score ?? 0);
  });

  it("scores spec-coverage from declared vs checked", () => {
    const result = scoreL1(
      makePanelInputs({
        specCoverage: {
          declared: { uiRoutes: 4, apiEndpoints: 2, dbObjects: 0 },
          checked: { uiOk: 2, apiNon404: 1, dbPresent: 0 },
          missing: { uiRoutes: ["/a", "/b"], apiEndpoints: ["/c"], dbObjects: [] },
          evidenceRefs: ["specs"],
        },
      }),
    );
    const spcAxis = result.axes.find((a) => a.axisId === "spec-coverage");
    expect(spcAxis).toBeDefined();
    expect(spcAxis?.score).toBeCloseTo(0.5); // 3/6
  });
});

describe("scoreL2", () => {
  it("computes L2 score from evidence inputs", () => {
    const inputs = makePanelInputs();
    const result = scoreL2(inputs);

    expect(result.panel).toBe("L2");
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(1);
    expect(result.axes.length).toBe(5);
    expect(result.axes.map((a) => a.axisId)).toEqual([
      "discussion-axes",
      "screen-contract-fidelity",
      "trend-alignment",
      "visual-findings",
      "browser-qa-experience",
    ]);
  });

  it("penalizes visual findings", () => {
    const clean = scoreL2(
      makePanelInputs({ browserQa: { ...makePanelInputs().browserQa, visualFindings: 0 } }),
    );
    const dirty = scoreL2(
      makePanelInputs({ browserQa: { ...makePanelInputs().browserQa, visualFindings: 5 } }),
    );

    const cleanAxis = clean.axes.find((a) => a.axisId === "visual-findings");
    const dirtyAxis = dirty.axes.find((a) => a.axisId === "visual-findings");
    expect(cleanAxis).toBeDefined();
    expect(dirtyAxis).toBeDefined();
    expect(cleanAxis?.score).toBeGreaterThan(dirtyAxis?.score ?? 0);
  });
});

describe("scorePanelsFromInputs", () => {
  it("returns l1, l2, and weightedTotal = min(l1, l2)", () => {
    const inputs = makePanelInputs();
    const { l1, l2, weightedTotal } = scorePanelsFromInputs(inputs);

    expect(l1.panel).toBe("L1");
    expect(l2.panel).toBe("L2");
    expect(weightedTotal).toBe(Math.min(l1.total, l2.total));
  });
});
