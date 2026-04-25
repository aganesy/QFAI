import type { CandidateId } from "./candidate.js";
import type { ExplorationRound } from "./round.js";
import { roundCandidateArtifactPath } from "./round.js";

export type CandidateConcept = {
  schemaVersion: "2.0";
  candidateId: CandidateId;
  round: ExplorationRound;
  statement: string;
  anchors: string[];
  nonGoals: string[];
  pivotFromPrior: string | null;
};

export type BuildCandidateConceptInput = Omit<CandidateConcept, "schemaVersion">;

export function buildCandidateConcept(input: BuildCandidateConceptInput): CandidateConcept {
  if (input.statement.trim().length === 0) {
    throw new Error("buildCandidateConcept: statement must be non-empty");
  }

  return {
    schemaVersion: "2.0",
    candidateId: input.candidateId,
    round: input.round,
    statement: input.statement,
    anchors: [...input.anchors],
    nonGoals: [...input.nonGoals],
    pivotFromPrior: input.pivotFromPrior,
  };
}

export function candidateConceptPath(round: ExplorationRound, candidateId: CandidateId): string {
  return roundCandidateArtifactPath(round, candidateId, "concept.json");
}
