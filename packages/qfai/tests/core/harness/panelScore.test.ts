import { describe, expect, it } from "vitest";

import {
  computeWeightedTotal,
  determineDecision,
  validatePanelScore,
} from "../../../src/core/harness/panelScore.js";
import type { FullHarnessPanelScore } from "../../../src/core/harness/types.js";

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

  it("returns pivot when below refine threshold", () => {
    expect(determineDecision(0.3, thresholds)).toBe("pivot");
    expect(determineDecision(0.0, thresholds)).toBe("pivot");
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
