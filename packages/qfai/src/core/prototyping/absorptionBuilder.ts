import type { CandidateId } from "./candidate.js";
import type { AbsorptionRound } from "./round.js";

import type { HarvestRecord } from "./harvestBuilder.js";

export const DEFAULT_REJECTED_REASON = "Pending absorption triage.";

export type AbsorptionApplied = {
  harvestId: string;
  adaptation: string;
  conceptCompatibility: "aligned" | "adapt-required";
  adaptationStrategy?: string;
};

export type AbsorptionRejected = {
  harvestId: string;
  reason: string;
  conflictingNonGoals?: string[];
};

export type AbsorptionPlan = {
  schemaVersion: "2.0";
  round: AbsorptionRound;
  harvestRef: string;
  absorptions: Array<{
    targetCandidateId: CandidateId;
    targetConceptRef: string;
    applied: AbsorptionApplied[];
    rejected: AbsorptionRejected[];
    rationale: string;
  }>;
};

export type BuildAbsorptionPlanInput = {
  round: AbsorptionRound;
  harvest: HarvestRecord;
  harvestRef: string;
  survivors: CandidateId[];
  targetConceptRefs: Record<string, string>;
  defaultRejectedReason?: string;
};

export function buildAbsorptionPlan(input: BuildAbsorptionPlanInput): AbsorptionPlan {
  if (input.round !== input.harvest.toRound) {
    throw new Error(
      `buildAbsorptionPlan: round ${input.round} does not match harvest.toRound ${input.harvest.toRound}`,
    );
  }

  const defaultRejectedReason = input.defaultRejectedReason ?? DEFAULT_REJECTED_REASON;

  return {
    schemaVersion: "2.0",
    round: input.round,
    harvestRef: input.harvestRef,
    absorptions: input.survivors.map((targetCandidateId) => {
      const targetConceptRef = input.targetConceptRefs[targetCandidateId];
      if (!targetConceptRef || targetConceptRef.trim().length === 0) {
        throw new Error(
          `buildAbsorptionPlan: missing targetConceptRef for survivor ${targetCandidateId}`,
        );
      }

      return {
        targetCandidateId,
        targetConceptRef,
        applied: [],
        rejected: input.harvest.harvestedElements.map((harvestedElement) => ({
          harvestId: harvestedElement.harvestId,
          reason: defaultRejectedReason,
        })),
        rationale: "Pending absorption curation.",
      };
    }),
  };
}
