import { describe, expect, it } from "vitest";

import {
  buildEvaluatorReviewV2,
  calculateRegressionAlert,
} from "../../../src/core/prototyping/evaluatorReviewV2.js";

describe("spec-0018 evaluator review v2", () => {
  it("calculates regression alerts only when score drops past the threshold", () => {
    expect(calculateRegressionAlert(90, null)).toBe(false);
    expect(calculateRegressionAlert(90, 94)).toBe(false);
    expect(calculateRegressionAlert(88, 94, 5)).toBe(true);
  });

  it("builds a structured review and auto-computes regressionAlert", () => {
    const review = buildEvaluatorReviewV2({
      candidateId: "c1",
      round: "r3",
      reviewerId: "product-surface-reviewer",
      perAxis: [
        {
          axisId: "design-quality",
          score: 92,
          rationale: "Strong hierarchy",
          evidenceRefs: [".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.png"],
        },
      ],
      strengths: [
        {
          id: "s1",
          category: "layout",
          description: "Strong shell",
          screenRefs: ["home"],
          evidenceRefs: [".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.png"],
        },
        {
          id: "s2",
          category: "interaction",
          description: "Clear CTA",
          screenRefs: ["home"],
          evidenceRefs: [".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.commands.json"],
        },
        {
          id: "s3",
          category: "navigation",
          description: "Good wayfinding",
          screenRefs: ["orders"],
          evidenceRefs: [".qfai/evidence/prototyping/rounds/r3/candidates/c1/orders.png"],
        },
      ],
      weaknesses: [],
      conceptFit: {
        overallScore: 82,
        rationale: "A bit noisier than the previous round",
        anchorsFromExplorationBrief: ["CONCEPT-0001"],
        divergences: ["Density increased in the sidebar"],
        evidenceRefs: [".qfai/evidence/prototyping/rounds/r3/candidates/c1/concept.json"],
        priorRoundScore: 90,
        regressionThreshold: 5,
      },
      coherenceFindings: [],
    });

    expect(review.schemaVersion).toBe("2.0");
    expect(review.conceptFit.regressionAlert).toBe(true);
    expect(review.strengths).toHaveLength(3);
  });

  it("rejects reviews with fewer than 3 strengths", () => {
    expect(() =>
      buildEvaluatorReviewV2({
        candidateId: "c1",
        round: "r5",
        reviewerId: "product-surface-reviewer",
        perAxis: [],
        strengths: [
          {
            id: "s1",
            category: "layout",
            description: "Only one",
            screenRefs: ["home"],
            evidenceRefs: ["ref"],
          },
        ],
        weaknesses: [],
        conceptFit: {
          overallScore: 90,
          rationale: "good",
          anchorsFromExplorationBrief: ["CONCEPT-0001"],
          divergences: [],
          evidenceRefs: ["ref"],
          priorRoundScore: null,
        },
        coherenceFindings: [],
      }),
    ).toThrow(/at least 3 entries/);
  });
});
