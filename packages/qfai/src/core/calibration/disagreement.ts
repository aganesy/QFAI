/**
 * Reviewer disagreement handler — resolves conflicting reviewer scores
 * using majority rule with tie-breaking (SD-0030-001, BR-0030-0009, BR-0030-0010).
 */

import type { Decision, DecisionResult, ReviewerScore, ThresholdConfig } from "./types.js";
import { DEFAULT_THRESHOLDS } from "./types.js";
import { ScoringEngine } from "./scoring.js";

export class DisagreementHandler {
  private engine: ScoringEngine;

  constructor(thresholds?: ThresholdConfig) {
    this.engine = new ScoringEngine(thresholds ?? { ...DEFAULT_THRESHOLDS });
  }

  resolve(reviewerScores: ReviewerScore[]): DecisionResult {
    if (reviewerScores.length === 0) {
      return { decision: "pivot", score: 0 };
    }

    // Classify each reviewer's score
    const classifications = reviewerScores.map((r) => ({
      decision: this.engine.classify(r.score),
      score: r.score,
      confidence: r.confidence ?? r.score,
    }));

    // Count votes per decision
    const counts = new Map<Decision, number>();
    for (const c of classifications) {
      counts.set(c.decision, (counts.get(c.decision) ?? 0) + 1);
    }

    // Find majority
    let maxCount = 0;
    let majorityDecisions: Decision[] = [];
    for (const [decision, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        majorityDecisions = [decision];
      } else if (count === maxCount) {
        majorityDecisions.push(decision);
      }
    }

    let finalDecision: Decision;
    if (majorityDecisions.length === 1) {
      finalDecision = majorityDecisions[0]!;
    } else {
      // Tie-breaking: highest confidence wins
      let bestConfidence = -1;
      finalDecision = "pivot";
      for (const c of classifications) {
        if (majorityDecisions.includes(c.decision) && c.confidence > bestConfidence) {
          bestConfidence = c.confidence;
          finalDecision = c.decision;
        }
      }
    }

    // Average score for aggregated result
    const avgScore = reviewerScores.reduce((sum, r) => sum + r.score, 0) / reviewerScores.length;

    return {
      decision: finalDecision,
      score: avgScore,
    };
  }
}
