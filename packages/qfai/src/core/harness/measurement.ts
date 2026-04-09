/**
 * Measurement engine — v1.7.15
 *
 * Orchestrates a single measurement iteration:
 * 1. Validate reviewer
 * 2. Resolve commitSha
 * 3. Compute panel scores and weightedTotal
 * 4. Build iteration record
 * 5. Append to history
 * 6. Compute termination
 */

import type { MeasurementInput, MeasurementResult, FullHarnessIteration } from "./types.js";
import { computeWeightedTotal, determineDecision } from "./panelScore.js";
import { appendIteration, computeTerminationReason, loadHistory } from "./history.js";
import { validateReviewer } from "./reviewerIdentity.js";
import { resolveCommitSha } from "./gitRevision.js";

export async function runMeasurement(input: MeasurementInput): Promise<MeasurementResult> {
  const reviewer = validateReviewer(input.reviewer);
  const commitSha = await resolveCommitSha(input.root);

  const weightedTotal = computeWeightedTotal(input.l1, input.l2);
  const decision = determineDecision(weightedTotal, input.calibration.thresholds);

  const iteration: FullHarnessIteration = {
    iteration: 0, // Will be set by appendIteration
    commitSha,
    reviewerId: reviewer,
    timestamp: new Date().toISOString(),
    changeSummary: input.changeSummary,
    limitations: input.limitations,
    evidenceRefs: {
      render: input.renderRefs ?? [],
      browserQa: input.browserQaRefs ?? [],
      runtimeGate: input.runtimeGateRefs ?? [],
      uiObservation: input.uiObservationRefs ?? [],
      specCoverage: input.specCoverageRefs ?? [],
      discussion: input.discussionRefs ?? [],
      screenContract: input.screenContractRefs ?? [],
      trend: input.trendRefs ?? [],
    },
    l1: input.l1,
    l2: input.l2,
    weightedTotal,
    deltaFromPrevious: null, // Will be set by appendIteration
    decision,
  };

  const previousHistory = await loadHistory(input.root);
  const updatedHistory = appendIteration(previousHistory, iteration);
  const terminationReason = computeTerminationReason(updatedHistory, input.calibration);
  if (terminationReason) {
    updatedHistory.terminationReason = terminationReason;
  }

  const isTerminal = terminationReason !== undefined;

  const finalIteration = updatedHistory.iterations[updatedHistory.iterations.length - 1];
  if (!finalIteration) {
    throw new Error("Measurement failed: no iteration was appended to history.");
  }

  return {
    iteration: finalIteration,
    history: updatedHistory,
    terminationReason,
    isTerminal,
  };
}
