/**
 * Scoring engine — evaluates scores against thresholds and produces
 * accept/refine/reject decisions (BR-0030-0005 through BR-0030-0008).
 */

import type { Decision, DecisionResult, ThresholdConfig } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./types.js";

export class ScoringEngine {
  private thresholds: ThresholdConfig;

  constructor(thresholds?: ThresholdConfig) {
    const t = thresholds ?? { ...DEFAULT_THRESHOLDS };
    this.validateThresholds(t);
    this.thresholds = t;
  }

  private validateThresholds(t: ThresholdConfig): void {
    if (!Number.isFinite(t.accept) || t.accept < 0 || t.accept > 1) {
      throw new Error(`Threshold 'accept' out of range: ${t.accept} (must be finite 0.0-1.0)`);
    }
    if (!Number.isFinite(t.refine) || t.refine < 0 || t.refine > 1) {
      throw new Error(`Threshold 'refine' out of range: ${t.refine} (must be finite 0.0-1.0)`);
    }
    if (t.accept < t.refine) {
      throw new Error(`Threshold 'accept' (${t.accept}) must be >= 'refine' (${t.refine})`);
    }
  }

  setThresholds(thresholds: ThresholdConfig): void {
    this.validateThresholds(thresholds);
    this.thresholds = thresholds;
  }

  getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }

  classify(score: number): Decision {
    if (score >= this.thresholds.accept) return "accept";
    if (score >= this.thresholds.refine) return "refine";
    return "reject";
  }

  evaluate(score: number, feedback?: string): DecisionResult {
    return {
      decision: this.classify(score),
      score,
      feedback,
    };
  }
}
