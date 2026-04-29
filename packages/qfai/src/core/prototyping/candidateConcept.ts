import type { CandidateId } from "./candidate.js";
import type { ExplorationRound } from "./round.js";
import { roundCandidateArtifactPath } from "./round.js";

export type CandidateConcept = {
  schemaVersion: "2.0";
  candidateId: CandidateId;
  round: ExplorationRound;
  statement: string;
  designThesis: string;
  referenceLineage: string[];
  templateSeedUsage: "none" | "reference-only" | "implementation-seed";
  antiTemplateConstraints: string[];
  noveltyBet: string;
  anchors: string[];
  nonGoals: string[];
  pivotFromPrior: string | null;
};

export type BuildCandidateConceptInput = Omit<CandidateConcept, "schemaVersion">;

export function buildCandidateConcept(input: BuildCandidateConceptInput): CandidateConcept {
  if (input.statement.trim().length === 0) {
    throw new Error("buildCandidateConcept: statement must be non-empty");
  }
  if (input.designThesis.trim().length === 0) {
    throw new Error("buildCandidateConcept: designThesis must be non-empty");
  }
  if (input.noveltyBet.trim().length === 0) {
    throw new Error("buildCandidateConcept: noveltyBet must be non-empty");
  }
  if (input.templateSeedUsage !== "none" && input.antiTemplateConstraints.length === 0) {
    throw new Error("buildCandidateConcept: templateSeedUsage requires antiTemplateConstraints");
  }

  return {
    schemaVersion: "2.0",
    candidateId: input.candidateId,
    round: input.round,
    statement: input.statement,
    designThesis: input.designThesis,
    referenceLineage: [...input.referenceLineage],
    templateSeedUsage: input.templateSeedUsage,
    antiTemplateConstraints: [...input.antiTemplateConstraints],
    noveltyBet: input.noveltyBet,
    anchors: [...input.anchors],
    nonGoals: [...input.nonGoals],
    pivotFromPrior: input.pivotFromPrior,
  };
}

export function candidateConceptPath(round: ExplorationRound, candidateId: CandidateId): string {
  return roundCandidateArtifactPath(round, candidateId, "concept.json");
}
