// QFAI:SPEC-0031:TC-0031-0005
// QFAI:SPEC-0031:TC-0031-0006
// QFAI:SPEC-0031:TC-0031-0017
// QFAI:SPEC-0031:TC-0031-0018
// QFAI:SPEC-0031:TC-0031-0019
// QFAI:SPEC-0031:TC-0031-0024
// QFAI:SPEC-0031:TC-0031-0028
// QFAI:SPEC-0031:TC-0031-0029
// QFAI:SPEC-0031:TC-0031-0030
import { describe, expect, it, vi } from "vitest";

import { Evaluator } from "../../../src/core/harness/evaluator.js";
import type { CritiqueResult } from "../../../src/core/critique/types.js";
import type { EvaluatorInput } from "../../../src/core/harness/types.js";

function makeInput(overrides?: Partial<EvaluatorInput>): EvaluatorInput {
  return {
    output: {
      content: "test output",
      metadata: {
        dimensionScores: { quality: 0.5, correctness: 0.5, completeness: 0.5, style: 0.5 },
      },
    },
    strategy: { approach: "test", constraints: [], budgetGuidance: "standard" },
    iteration: 1,
    ...overrides,
  };
}

describe("Evaluator", () => {
  describe("scoring with critique (TC-0031-0005)", () => {
    it("incorporates critique into dimension scores", () => {
      const critique: CritiqueResult = {
        failOpen: false,
        response: {
          scores: { quality: 9, correctness: 8 },
          dimensions: ["quality", "correctness"],
          suggestions: ["minor improvements"],
        },
      };

      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.7, correctness: 0.7 } },
          },
          critique,
        }),
      );

      expect(result.weightedTotal).toBeDefined();
      expect(result.dimensionScores.length).toBeGreaterThan(0);
    });
  });

  describe("critique fail-open (TC-0031-0006)", () => {
    it("continues scoring with calibration only when critique times out", () => {
      const critique: CritiqueResult = {
        failOpen: true,
        response: undefined,
        reason: "timeout",
      };

      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = evaluator.evaluate(makeInput({ critique }));
      warnSpy.mockRestore();

      expect(result.decision).toBeDefined();
      expect(result.weightedTotal).toBeDefined();
    });
  });

  describe("dimension floor enforcement (TC-0031-0017)", () => {
    it("blocks accept when one dimension is below floor", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
        dimensionFloors: { quality: 0.6 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.4, correctness: 0.95 } },
          },
        }),
      );

      // Quality below floor (0.4 < 0.6) blocks accept despite high total
      expect(result.decision).not.toBe("accept");
      expect(result.feedback).toContain("floor violation");
    });
  });

  describe("dimension floor all clear (TC-0031-0018)", () => {
    it("permits accept when all dimensions above floors", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
        dimensionFloors: { quality: 0.6, correctness: 0.6 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.85, correctness: 0.85 } },
          },
        }),
      );

      expect(result.decision).toBe("accept");
    });
  });

  describe("weighted scoring calculation (TC-0031-0019)", () => {
    it("calculates weighted total from dimension scores", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.3, correctness: 0.3, completeness: 0.2, style: 0.2 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: {
              dimensionScores: { quality: 0.9, correctness: 0.8, completeness: 0.7, style: 0.6 },
            },
          },
        }),
      );

      // Manual: (0.9*0.3 + 0.8*0.3 + 0.7*0.2 + 0.6*0.2) / 1.0 = 0.27+0.24+0.14+0.12 = 0.77
      expect(result.weightedTotal).toBeCloseTo(0.77, 2);
    });
  });

  describe("calibration baseline normalization (TC-0031-0024)", () => {
    it("normalizes scores using calibration baselines", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
        calibrationBaselines: { quality: 0.8, correctness: 0.9 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.72, correctness: 0.81 } },
          },
        }),
      );

      // Normalized: quality = 0.72/0.8 = 0.9, correctness = 0.81/0.9 = 0.9
      expect(result.weightedTotal).toBeCloseTo(0.9, 1);
    });
  });

  describe("tristate decision: refine (TC-0031-0028)", () => {
    it("returns refine with feedback when score is 0.65", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.65, correctness: 0.65 } },
          },
        }),
      );

      expect(result.decision).toBe("refine");
      expect(result.feedback).toBeTruthy();
    });
  });

  describe("tristate decision: pivot (TC-0031-0029)", () => {
    it("returns pivot with context when score is 0.30", () => {
      const evaluator = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });

      const result = evaluator.evaluate(
        makeInput({
          output: {
            content: "test",
            metadata: { dimensionScores: { quality: 0.3, correctness: 0.3 } },
          },
        }),
      );

      expect(result.decision).toBe("pivot");
      expect(result.pivotContext).toBeTruthy();
    });
  });

  describe("critique incorporated (TC-0031-0030)", () => {
    it("shifts dimension scores when critique is available", () => {
      const withoutCritique = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });
      const withCritique = new Evaluator({
        thresholds: { accept: 0.8, refine: 0.5 },
        dimensionWeights: { quality: 0.5, correctness: 0.5 },
      });

      const baseInput = makeInput({
        output: {
          content: "test",
          metadata: { dimensionScores: { quality: 0.6, correctness: 0.6 } },
        },
      });

      const resultWithout = withoutCritique.evaluate(baseInput);

      const critique: CritiqueResult = {
        failOpen: false,
        response: {
          scores: { quality: 9, correctness: 8 },
          dimensions: ["quality", "correctness"],
          suggestions: [],
        },
      };
      const resultWith = withCritique.evaluate({ ...baseInput, critique });

      // With critique, scores should shift
      expect(resultWith.weightedTotal).not.toEqual(resultWithout.weightedTotal);
    });
  });
});
