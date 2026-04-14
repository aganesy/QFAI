/**
 * Measurement engine — v1.7.15 (rev11 strictness)
 *
 * Orchestrates a single measurement iteration:
 * 1. Validate reviewer
 * 2. Validate traceability refs (category strictness)
 * 3. Validate panel scores (strict evidence)
 * 4. Resolve commitSha
 * 5. Compute weightedTotal
 * 6. Build iteration record
 * 7. Append to history
 * 8. Compute termination
 *
 * rev11 breaking change: this helper enforces the full strict traceability
 * contract by itself, so it is NO LONGER exported from `src/core/index.ts`.
 */

import type { MeasurementInput, MeasurementResult, FullHarnessIteration } from "./types.js";
import { computeWeightedTotal, determineDecision, validatePanelScore } from "./panelScore.js";
import { appendIteration, computeTerminationReason, loadHistory } from "./history.js";
import { validateReviewer } from "./reviewerIdentity.js";
import { resolveCommitSha } from "./gitRevision.js";
import { assertConcreteArtifactRef } from "../prototyping/pathUtils.js";
import { isCanonicalScreenContractRef } from "../prototyping/refSemantics.js";

function assertCategoryRefs(category: string, refs: readonly string[]): void {
  if (!Array.isArray(refs) || refs.length === 0) {
    throw new Error(`Full-harness measurement requires non-empty ${category} evidence refs.`);
  }
  for (const ref of refs) {
    if (typeof ref !== "string" || ref.trim().length === 0) {
      throw new Error(
        `Full-harness measurement ${category} evidence ref must be a non-empty string.`,
      );
    }
    try {
      assertConcreteArtifactRef(ref);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Full-harness measurement ${category} evidence ref is not a concrete artifact ref: ${reason}`,
      );
    }
  }
}

function assertScreenContractRefs(refs: readonly string[]): void {
  assertCategoryRefs("screenContractRefs", refs);
  for (const ref of refs) {
    if (!isCanonicalScreenContractRef(ref)) {
      throw new Error(
        `Full-harness measurement screenContractRefs must be canonical ` +
          `.qfai/discussion/<pack>/uiux/40_screen_contracts.md#<slug> refs. Got: ${ref}`,
      );
    }
  }
}

export async function runMeasurement(input: MeasurementInput): Promise<MeasurementResult> {
  assertCategoryRefs("renderRefs", input.renderRefs);
  assertCategoryRefs("browserQaRefs", input.browserQaRefs);
  assertCategoryRefs("runtimeGateRefs", input.runtimeGateRefs);
  assertCategoryRefs("uiObservationRefs", input.uiObservationRefs);
  assertCategoryRefs("specCoverageRefs", input.specCoverageRefs);
  assertCategoryRefs("discussionRefs", input.discussionRefs);
  assertCategoryRefs("trendRefs", input.trendRefs);
  assertScreenContractRefs(input.screenContractRefs);

  const l1Errors = validatePanelScore(input.l1);
  if (l1Errors.length > 0) {
    throw new Error(`Full-harness measurement rejected L1 panel score: ${l1Errors.join("; ")}`);
  }
  const l2Errors = validatePanelScore(input.l2);
  if (l2Errors.length > 0) {
    throw new Error(`Full-harness measurement rejected L2 panel score: ${l2Errors.join("; ")}`);
  }

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
      render: input.renderRefs,
      browserQa: input.browserQaRefs,
      runtimeGate: input.runtimeGateRefs,
      uiObservation: input.uiObservationRefs,
      specCoverage: input.specCoverageRefs,
      discussion: input.discussionRefs,
      screenContract: input.screenContractRefs,
      trend: input.trendRefs,
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
