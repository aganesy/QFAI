/**
 * Harness evidence generator — creates structured evidence and review
 * summaries from loop results.
 */

import type { HarnessEvidence, LoopResult, ReviewSummary } from "./types.js";

export function generateEvidence(
  result: LoopResult,
  runId?: string,
): HarnessEvidence {
  return {
    runId: runId ?? `harness-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: result.status,
    iterationCount: result.iterationCount,
    finalScore: result.finalScore,
    terminationReason: result.terminationReason,
    iterations: result.iterations,
    bestIteration: result.bestIteration,
  };
}

export function generateReviewSummary(result: LoopResult): ReviewSummary {
  return {
    finalScore: result.finalScore,
    recommendation: result.status === "accepted"
      ? "Output meets acceptance criteria"
      : result.status === "plateau"
        ? "Output plateaued; best result from iteration history"
        : "Iteration cap reached; best result selected",
    iterationSummary: result.iterations.map((iter) => ({
      iteration: iter.iteration,
      score: iter.evaluatorResult.weightedTotal,
      decision: iter.evaluatorResult.decision,
    })),
  };
}
