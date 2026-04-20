import { describe, expect, it } from "vitest";

import { appendIteration, computeTerminationReason } from "../../../src/core/harness/history.js";
import type { FullHarnessHistory, FullHarnessIteration } from "../../../src/core/harness/types.js";

function makeIteration(overrides: Partial<FullHarnessIteration> = {}): FullHarnessIteration {
  return {
    iteration: 0,
    commitSha: "abc123",
    reviewerId: "reviewer-1",
    timestamp: "2025-01-01T00:00:00Z",
    changeSummary: ["Initial implementation"],
    limitations: [],
    evidenceRefs: {
      render: [],
      browserQa: [],
      runtimeGate: [],
      uiFidelity: [],
      specCoverage: [],
    },
    l1: { panel: "L1", total: 0.7, axes: [] },
    l2: { panel: "L2", total: 0.6, axes: [] },
    weightedTotal: 0.6,
    deltaFromPrevious: null,
    decision: "refine",
    ...overrides,
  };
}

describe("appendIteration", () => {
  it("creates new history when null", () => {
    const iteration = makeIteration();
    const history = appendIteration(null, iteration);

    expect(history.iterations).toHaveLength(1);
    expect(history.iterations[0]?.iteration).toBe(1);
    expect(history.iterations[0]?.deltaFromPrevious).toBeNull();
    expect(history.bestIteration).toBe(1);
    expect(history.scoringTrace).toHaveLength(1);
  });

  it("appends to existing history", () => {
    const first = makeIteration({ weightedTotal: 0.5 });
    const history1 = appendIteration(null, first);

    const second = makeIteration({ weightedTotal: 0.7, commitSha: "def456" });
    const history2 = appendIteration(history1, second);

    expect(history2.iterations).toHaveLength(2);
    expect(history2.iterations[1]?.iteration).toBe(2);
    expect(history2.iterations[1]?.deltaFromPrevious).toBeCloseTo(0.2);
    expect(history2.bestIteration).toBe(2);
  });

  it("auto-numbers iterations", () => {
    const history1 = appendIteration(null, makeIteration());
    const history2 = appendIteration(history1, makeIteration());
    const history3 = appendIteration(history2, makeIteration());

    expect(history3.iterations.map((i) => i.iteration)).toEqual([1, 2, 3]);
  });

  it("tracks best iteration correctly", () => {
    const h1 = appendIteration(null, makeIteration({ weightedTotal: 0.8 }));
    const h2 = appendIteration(h1, makeIteration({ weightedTotal: 0.5 }));
    const h3 = appendIteration(h2, makeIteration({ weightedTotal: 0.9 }));

    expect(h3.bestIteration).toBe(3);
  });

  it("builds scoring trace", () => {
    const h1 = appendIteration(null, makeIteration({ weightedTotal: 0.6 }));
    const h2 = appendIteration(h1, makeIteration({ weightedTotal: 0.7 }));

    expect(h2.scoringTrace).toHaveLength(2);
    expect(h2.scoringTrace[0]?.weightedTotal).toBe(0.6);
    expect(h2.scoringTrace[1]?.weightedTotal).toBe(0.7);
  });
});

describe("computeTerminationReason", () => {
  const calibration = {
    maxIterations: 5,
    plateauDelta: 0.02,
    plateauLookback: 3,
    thresholds: { accept: 0.8 },
  };

  it("returns undefined for empty history", () => {
    const history: FullHarnessHistory = {
      runId: "test",
      iterations: [],
      bestIteration: 0,
      scoringTrace: [],
    };
    expect(computeTerminationReason(history, calibration)).toBeUndefined();
  });

  it("returns max-iterations when limit reached", () => {
    let history: FullHarnessHistory | null = null;
    for (let i = 0; i < 5; i++) {
      history = appendIteration(
        history,
        makeIteration({ weightedTotal: 0.3 + i * 0.05, commitSha: `sha-${i}` }),
      );
    }
    if (!history) throw new Error("Expected history after iterations");
    expect(computeTerminationReason(history, calibration)).toBe("max-iterations");
  });

  it("returns converged when accept threshold met with plateau", () => {
    let history: FullHarnessHistory | null = null;
    for (let i = 0; i < 3; i++) {
      history = appendIteration(
        history,
        makeIteration({ weightedTotal: 0.85, decision: "accept", commitSha: `sha-${i}` }),
      );
    }
    if (!history) throw new Error("Expected history after iterations");
    expect(computeTerminationReason(history, calibration)).toBe("converged");
  });

  it("returns plateau when scores flat but below accept", () => {
    let history: FullHarnessHistory | null = null;
    for (let i = 0; i < 3; i++) {
      history = appendIteration(
        history,
        makeIteration({ weightedTotal: 0.5, commitSha: `sha-${i}` }),
      );
    }
    if (!history) throw new Error("Expected history after iterations");
    expect(computeTerminationReason(history, calibration)).toBe("plateau");
  });

  it("returns converged on accept decision", () => {
    // v1.7.15: single-iteration accept does NOT produce converged.
    // Convergence requires iterationCount >= 2 + plateau.
    const history = appendIteration(
      null,
      makeIteration({ weightedTotal: 0.9, decision: "accept" }),
    );
    expect(computeTerminationReason(history, calibration)).toBeUndefined();
  });

  it("returns undefined when still progressing", () => {
    const h1 = appendIteration(null, makeIteration({ weightedTotal: 0.3 }));
    const h2 = appendIteration(h1, makeIteration({ weightedTotal: 0.5 }));
    expect(computeTerminationReason(h2, calibration)).toBeUndefined();
  });
});
