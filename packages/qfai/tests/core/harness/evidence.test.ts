// QFAI:SPEC-0031:TC-0031-0014
// QFAI:SPEC-0031:TC-0031-0015
// QFAI:SPEC-0031:TC-0031-0016
import { describe, expect, it } from "vitest";

import { generateEvidence, generateReviewSummary } from "../../../src/core/harness/evidence.js";
import type { LoopResult } from "../../../src/core/harness/types.js";

function makeLoopResult(overrides?: Partial<LoopResult>): LoopResult {
  return {
    status: "accepted",
    finalOutput: { content: "final output" },
    finalScore: 0.85,
    terminationReason: "accepted",
    iterationCount: 3,
    bestIteration: 3,
    iterations: [
      {
        iteration: 1,
        generatorOutput: { content: "output 1" },
        evaluatorResult: {
          decision: "refine",
          weightedTotal: 0.6,
          dimensionScores: [],
          feedback: "improve quality",
        },
      },
      {
        iteration: 2,
        generatorOutput: { content: "output 2" },
        evaluatorResult: {
          decision: "refine",
          weightedTotal: 0.75,
          dimensionScores: [],
          feedback: "almost there",
        },
      },
      {
        iteration: 3,
        generatorOutput: { content: "output 3" },
        evaluatorResult: {
          decision: "accept",
          weightedTotal: 0.85,
          dimensionScores: [],
        },
      },
    ],
    ...overrides,
  };
}

describe("Harness Evidence", () => {
  describe("evidence accept (TC-0031-0014)", () => {
    it("generates evidence with iteration history and accepted termination", () => {
      const result = makeLoopResult();
      const evidence = generateEvidence(result, "test-run-001");

      expect(evidence.runId).toBe("test-run-001");
      expect(evidence.status).toBe("accepted");
      expect(evidence.terminationReason).toBe("accepted");
      expect(evidence.iterationCount).toBe(3);
      expect(evidence.iterations).toHaveLength(3);
      expect(evidence.finalScore).toBe(0.85);
    });
  });

  describe("evidence cap-reached (TC-0031-0015)", () => {
    it("generates evidence with cap-reached termination", () => {
      const result = makeLoopResult({
        status: "cap-reached",
        terminationReason: "cap-reached",
        iterationCount: 15,
      });
      const evidence = generateEvidence(result);

      expect(evidence.status).toBe("cap-reached");
      expect(evidence.terminationReason).toBe("cap-reached");
      expect(evidence.iterationCount).toBe(15);
    });
  });

  describe("review generation (TC-0031-0016)", () => {
    it("generates review summary with finalScore and iterationSummary", () => {
      const result = makeLoopResult();
      const review = generateReviewSummary(result);

      expect(review.finalScore).toBe(0.85);
      expect(review.recommendation).toBeTruthy();
      expect(review.iterationSummary).toHaveLength(3);
      expect(review.iterationSummary[0]!.iteration).toBe(1);
      expect(review.iterationSummary[0]!.decision).toBe("refine");
      expect(review.iterationSummary[2]!.decision).toBe("accept");
    });
  });
});
