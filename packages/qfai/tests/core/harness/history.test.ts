import { describe, expect, it } from "vitest";

import { appendIteration, computeTerminationReason } from "../../../src/core/harness/history.js";
import type { FullHarnessHistory, FullHarnessIteration } from "../../../src/core/harness/types.js";

function makeIteration(overrides: Partial<FullHarnessIteration> = {}): FullHarnessIteration {
  return {
    iteration: 0,
    commitSha: "abc123",
    timestamp: "2026-04-22T00:00:00.000Z",
    changeSummary: ["Initial implementation"],
    limitations: ["none"],
    evidenceRefs: {
      render: [".qfai/evidence/render.json#/screens/0"],
      browserQa: [".qfai/evidence/browser-qa.json#/findings/0"],
      runtimeGate: [".qfai/evidence/runtime-gate.json#/ui/0"],
      uiObservation: [".qfai/evidence/render/orders.desktop.html"],
      specCoverage: [".qfai/evidence/spec-coverage.json#/specs/0"],
      discussion: [
        ".qfai/discussion/discussion-20260422000000000/uiux/33_exploration_rubric.md#axis-1",
      ],
      screenContract: [".qfai/contracts/ui/screen-contracts.yaml#/screens/orders"],
      trend: [".qfai/discussion/discussion-20260422000000000/04_Sources.md#trend-scan"],
    },
    reviewerScores: [
      {
        reviewerId: "reviewer-1",
        role: "ux-reviewer",
        scores: [
          {
            axisId: "runtime",
            score: 100,
            rationale: "runtime gate passed",
            evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
          },
          {
            axisId: "fidelity",
            score: 100,
            rationale: "screen fidelity is aligned",
            evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
          },
        ],
      },
      {
        reviewerId: "reviewer-2",
        role: "product-reviewer",
        scores: [
          {
            axisId: "spec-coverage",
            score: 100,
            rationale: "coverage matches the contract",
            evidenceRefs: [".qfai/evidence/spec-coverage.json#/specs/0"],
          },
        ],
      },
    ],
    allReviewerAxesPerfect100: true,
    ...overrides,
  };
}

describe("appendIteration", () => {
  it("creates new history when null", () => {
    const history = appendIteration(null, makeIteration());

    expect(history.iterations).toHaveLength(1);
    expect(history.iterations[0]?.iteration).toBe(1);
    expect(history.bestIteration).toBe(1);
    expect(history.scoringTrace).toHaveLength(1);
    expect(history.scoringTrace[0]).toMatchObject({
      iteration: 1,
      reviewerCount: 2,
      axisCount: 3,
      minScore: 100,
      allReviewerAxesPerfect100: true,
      commitSha: "abc123",
    });
    expect(history.scoringTrace[0]?.averageScore).toBeCloseTo(100);
  });

  it("appends to existing history and auto-numbers iterations", () => {
    const history1 = appendIteration(
      null,
      makeIteration({
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 88,
                rationale: "needs more work",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );

    const history2 = appendIteration(
      history1,
      makeIteration({
        commitSha: "def456",
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 92,
                rationale: "improved but not enough",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );

    expect(history2.iterations).toHaveLength(2);
    expect(history2.iterations.map((item) => item.iteration)).toEqual([1, 2]);
    expect(history2.scoringTrace[1]).toMatchObject({
      iteration: 2,
      reviewerCount: 1,
      axisCount: 1,
      minScore: 92,
      allReviewerAxesPerfect100: false,
      commitSha: "def456",
    });
  });

  it("tracks best iteration using perfect-100 first, then score quality", () => {
    const h1 = appendIteration(
      null,
      makeIteration({
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 90,
                rationale: "almost there",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );
    const h2 = appendIteration(
      h1,
      makeIteration({
        commitSha: "def456",
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 94,
                rationale: "better but still short",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );
    const h3 = appendIteration(h2, makeIteration({ commitSha: "ghi789" }));

    expect(h3.bestIteration).toBe(3);
  });
});

describe("computeTerminationReason", () => {
  const iterationPolicy = { maxIterations: 3 };

  it("returns undefined for empty history", () => {
    const history: FullHarnessHistory = {
      runId: "test",
      iterations: [],
      bestIteration: 0,
      scoringTrace: [],
    };

    expect(computeTerminationReason(history, iterationPolicy)).toBeUndefined();
  });

  it("returns converged when every reviewer scores every axis at 100", () => {
    const history = appendIteration(null, makeIteration());

    expect(computeTerminationReason(history, iterationPolicy)).toBe("converged");
  });

  it("does not return converged when the latest iteration is below perfect 100", () => {
    const history = appendIteration(
      null,
      makeIteration({
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 99,
                rationale: "one point remains",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );

    expect(computeTerminationReason(history, iterationPolicy)).toBeUndefined();
  });

  it("returns max-iterations when the budget is exhausted without perfect 100", () => {
    let history: FullHarnessHistory | null = null;
    for (let i = 0; i < 3; i++) {
      history = appendIteration(
        history,
        makeIteration({
          commitSha: `sha-${i}`,
          reviewerScores: [
            {
              reviewerId: "reviewer-1",
              scores: [
                {
                  axisId: "runtime",
                  score: 90 + i,
                  rationale: "still under the bar",
                  evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
                },
              ],
            },
          ],
          allReviewerAxesPerfect100: false,
        }),
      );
    }

    if (!history) {
      throw new Error("Expected history after iterations");
    }

    expect(computeTerminationReason(history, iterationPolicy)).toBe("max-iterations");
  });

  it("returns undefined while iterations remain and perfect 100 is not reached", () => {
    const history = appendIteration(
      null,
      makeIteration({
        reviewerScores: [
          {
            reviewerId: "reviewer-1",
            scores: [
              {
                axisId: "runtime",
                score: 91,
                rationale: "still refining",
                evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
              },
            ],
          },
        ],
        allReviewerAxesPerfect100: false,
      }),
    );

    expect(computeTerminationReason(history, iterationPolicy)).toBeUndefined();
  });
});
