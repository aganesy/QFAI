/**
 * Evaluator — scores generator output using calibration pack and optional
 * external critique (BR-0031, spec-0029, spec-0030).
 *
 * Produces accept/refine/pivot decisions with dimension scores,
 * weighted totals, and floor enforcement.
 */

import type { CritiqueResult } from "../critique/types.js";
import type { ThresholdConfig } from "../calibration/types.js";
import { DEFAULT_THRESHOLDS } from "../calibration/types.js";
import type { DimensionScore, EvaluatorInput, EvaluatorResult } from "./types.js";

export type EvaluatorConfig = {
  thresholds: ThresholdConfig;
  dimensionWeights: Record<string, number>;
  dimensionFloors?: Record<string, number> | undefined;
  calibrationBaselines?: Record<string, number> | undefined;
};

export class Evaluator {
  private config: EvaluatorConfig;

  constructor(config: Partial<EvaluatorConfig> = {}) {
    this.config = {
      thresholds: config.thresholds ?? { ...DEFAULT_THRESHOLDS },
      dimensionWeights: config.dimensionWeights ?? {
        quality: 0.3,
        correctness: 0.3,
        completeness: 0.2,
        style: 0.2,
      },
      dimensionFloors: config.dimensionFloors,
      calibrationBaselines: config.calibrationBaselines,
    };
  }

  evaluate(input: EvaluatorInput): EvaluatorResult {
    // Score each dimension
    const dimensionScores = this.scoreDimensions(input);

    // Apply calibration baseline normalization if available
    if (this.config.calibrationBaselines) {
      for (const ds of dimensionScores) {
        const baseline = this.config.calibrationBaselines[ds.dimension];
        if (baseline !== undefined && baseline !== 0) {
          ds.score = ds.score / baseline;
          // Clamp to [0, 1]
          ds.score = Math.min(1, Math.max(0, ds.score));
        }
      }
    }

    // Incorporate critique if available
    if (input.critique && !input.critique.failOpen) {
      this.incorporateCritique(dimensionScores, input.critique);
    }

    // Calculate weighted total
    const weightedTotal = this.calculateWeightedTotal(dimensionScores);

    // Check dimension floors
    const floorViolation = this.checkFloors(dimensionScores);

    // Determine decision
    let decision: "accept" | "refine" | "pivot";
    let feedback: string | undefined;
    let pivotContext: string | undefined;

    if (floorViolation) {
      // Floor violation blocks accept
      decision = weightedTotal >= this.config.thresholds.refine ? "refine" : "pivot";
      feedback = `Dimension floor violation: ${floorViolation.dimension} scored ${floorViolation.score} (floor: ${floorViolation.floor})`;
    } else if (weightedTotal >= this.config.thresholds.accept) {
      decision = "accept";
    } else if (weightedTotal >= this.config.thresholds.refine) {
      decision = "refine";
      const weakDimensions = dimensionScores
        .filter((ds) => ds.score < this.config.thresholds.refine)
        .map((ds) => ds.dimension);
      feedback =
        weakDimensions.length > 0
          ? `Weak dimensions: ${weakDimensions.join(", ")}. Focus improvement here.`
          : "Overall score below accept threshold. Improve across all dimensions.";
    } else {
      decision = "pivot";
      pivotContext = "Fundamental approach mismatch. Score too low for refinement.";
    }

    return {
      decision,
      weightedTotal,
      dimensionScores,
      feedback,
      pivotContext,
    };
  }

  private scoreDimensions(input: EvaluatorInput): DimensionScore[] {
    const scores: DimensionScore[] = [];
    for (const [dimension, weight] of Object.entries(this.config.dimensionWeights)) {
      // Derive score from output characteristics (simplified scoring for implementation)
      const score = this.deriveDimensionScore(dimension, input);
      scores.push({
        dimension,
        score,
        weight,
        floor: this.config.dimensionFloors?.[dimension],
      });
    }
    return scores;
  }

  private deriveDimensionScore(_dimension: string, input: EvaluatorInput): number {
    // In production, this would use the calibration pack and actual analysis.
    // For the harness implementation, the score comes from the evaluator input's
    // pre-scored data or defaults to a moderate score.
    const metadata = input.output.metadata ?? {};
    const preScored = metadata["dimensionScores"] as Record<string, number> | undefined;
    if (preScored && typeof preScored[_dimension] === "number") {
      return preScored[_dimension];
    }
    return 0.5; // Default moderate score
  }

  private incorporateCritique(
    dimensionScores: DimensionScore[],
    critique: Extract<CritiqueResult, { failOpen: false }>,
  ): void {
    for (const ds of dimensionScores) {
      const critiqueScore = critique.response.scores[ds.dimension];
      if (critiqueScore !== undefined) {
        // Blend critique score with dimension score (30% critique weight)
        const normalizedCritique = critiqueScore / 10; // Normalize 0-10 to 0-1
        ds.score = ds.score * 0.7 + normalizedCritique * 0.3;
      }
    }
  }

  private calculateWeightedTotal(dimensionScores: DimensionScore[]): number {
    let total = 0;
    let totalWeight = 0;
    for (const ds of dimensionScores) {
      total += ds.score * ds.weight;
      totalWeight += ds.weight;
    }
    return totalWeight > 0 ? total / totalWeight : 0;
  }

  private checkFloors(dimensionScores: DimensionScore[]): DimensionScore | undefined {
    for (const ds of dimensionScores) {
      if (ds.floor !== undefined && ds.score < ds.floor) {
        return ds;
      }
    }
    return undefined;
  }
}
