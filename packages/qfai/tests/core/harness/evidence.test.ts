// QFAI:SPEC-0012:TC-0012-0014
// QFAI:SPEC-0012:TC-0012-0015
// QFAI:SPEC-0012:TC-0012-0016
import { describe, expect, it } from "vitest";

import {
  appendIteration,
  computeTerminationReason,
  loadHistory,
} from "../../../src/core/harness/history.js";
import type { FullHarnessHistory, FullHarnessIteration } from "../../../src/core/harness/types.js";

function makePanelScore(panel: "L1" | "L2", total: number) {
  return {
    panel,
    total,
    axes: [{ axisId: "test", score: total, rationale: "test rationale", evidenceRefs: [] }],
  };
}

function makeIteration(overrides?: Partial<FullHarnessIteration>): FullHarnessIteration {
  return {
    iteration: 0,
    commitSha: "abc123",
    reviewerId: "test-reviewer",
    timestamp: new Date().toISOString(),
    changeSummary: ["test change"],
    limitations: [],
    evidenceRefs: {
      render: [],
      browserQa: [],
      runtimeGate: [],
      uiFidelity: [],
      specCoverage: [],
    },
    l1: makePanelScore("L1", 0.85),
    l2: makePanelScore("L2", 0.8),
    weightedTotal: 0.8,
    deltaFromPrevious: null,
    decision: "refine",
    ...overrides,
  };
}

describe("Harness Evidence (v1.7.15)", () => {
  describe("appendIteration accept (TC-0012-0014)", () => {
    it("appends iteration to history with correct numbering and scoring trace", () => {
      const iteration = makeIteration({ decision: "accept", weightedTotal: 0.85 });
      const history = appendIteration(null, iteration);

      expect(history.runId).toBeTruthy();
      expect(history.iterations).toHaveLength(1);
      expect(history.iterations[0].iteration).toBe(1);
      expect(history.iterations[0].decision).toBe("accept");
      expect(history.scoringTrace).toHaveLength(1);
      expect(history.scoringTrace[0].weightedTotal).toBe(0.85);
    });
  });

  describe("appendIteration max-iterations (TC-0012-0015)", () => {
    it("computes termination reason as max-iterations when limit is reached", () => {
      let history: FullHarnessHistory | null = null;
      for (let i = 0; i < 3; i++) {
        const iteration = makeIteration({ weightedTotal: 0.5 + i * 0.1 });
        history = appendIteration(history, iteration);
      }

      if (!history) throw new Error("Expected history after iterations");

      const reason = computeTerminationReason(history, {
        maxIterations: 3,
        plateauDelta: 0.02,
        plateauLookback: 3,
        thresholds: { accept: 0.8 },
      });

      expect(reason).toBe("max-iterations");
      expect(history.iterations).toHaveLength(3);
    });
  });

  describe("scoring trace generation (TC-0012-0016)", () => {
    it("generates scoring trace with delta from previous for multiple iterations", () => {
      const iter1 = makeIteration({ weightedTotal: 0.6, decision: "refine" });
      const iter2 = makeIteration({ weightedTotal: 0.75, decision: "refine" });
      const iter3 = makeIteration({ weightedTotal: 0.85, decision: "accept" });

      let history = appendIteration(null, iter1);
      history = appendIteration(history, iter2);
      history = appendIteration(history, iter3);

      expect(history.scoringTrace).toHaveLength(3);
      expect(history.scoringTrace[0].deltaFromPrevious).toBeNull();
      expect(history.scoringTrace[1].deltaFromPrevious).toBeCloseTo(0.15);
      expect(history.scoringTrace[2].deltaFromPrevious).toBeCloseTo(0.1);
      expect(history.bestIteration).toBe(3);
    });
  });

  describe("loadHistory returns null for missing file", () => {
    it("returns null when evidence file does not exist", async () => {
      const history = await loadHistory("/nonexistent/path");
      expect(history).toBeNull();
    });
  });
});
