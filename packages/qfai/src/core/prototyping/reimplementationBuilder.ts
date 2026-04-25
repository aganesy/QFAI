import type { CandidateId } from "./candidate.js";
import type { AbsorptionRound } from "./round.js";

export type ReimplementationRecord = {
  schemaVersion: "2.0";
  round: AbsorptionRound;
  absorptionPlanRef: string;
  candidateChanges: Array<{
    candidateId: CandidateId;
    changedScreens: string[];
    diffSummary: string;
    codeChangeEvidenceRef: string;
  }>;
};

export type BuildReimplementationRecordInput = {
  round: AbsorptionRound;
  absorptionPlanRef: string;
  candidateChanges?: ReimplementationRecord["candidateChanges"];
};

export function buildReimplementationRecord(
  input: BuildReimplementationRecordInput,
): ReimplementationRecord {
  return {
    schemaVersion: "2.0",
    round: input.round,
    absorptionPlanRef: input.absorptionPlanRef,
    candidateChanges: [...(input.candidateChanges ?? [])],
  };
}
