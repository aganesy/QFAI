/**
 * Scoring engine — evaluates scores against thresholds and produces
 * accept/refine/pivot decisions (BR-0030-0005 through BR-0030-0008).
 */

import type { Decision, DecisionResult, ThresholdConfig } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./types.js";

export class ScoringEngine {
  private thresholds: ThresholdConfig;

  constructor(thresholds?: ThresholdConfig) {
    this.thresholds = thresholds ?? { ...DEFAULT_THRESHOLDS };
  }

  setThresholds(thresholds: ThresholdConfig): void {
    if (thresholds.accept < 0 || thresholds.accept > 1) {
      throw new Error(
        `Threshold 'accept' out of range: ${thresholds.accept} (must be 0.0-1.0)`,
      );
    }
    if (thresholds.refine < 0 || thresholds.refine > 1) {
      throw new Error(
        `Threshold 'refine' out of range: ${thresholds.refine} (must be 0.0-1.0)`,
      );
    }
    this.thresholds = thresholds;
  }

  getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }

  classify(score: number): Decision {
    if (score >= this.thresholds.accept) return "accept";
    if (score >= this.thresholds.refine) return "refine";
    return "pivot";
  }

  evaluate(score: number, feedback?: string): DecisionResult {
    return {
      decision: this.classify(score),
      score,
      feedback,
    };
  }
}
