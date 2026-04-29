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

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

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
  const referenceLineage = normalizeMeaningfulStringArray(
    "referenceLineage",
    input.referenceLineage,
    true,
  );
  const antiTemplateConstraints = normalizeMeaningfulStringArray(
    "antiTemplateConstraints",
    input.antiTemplateConstraints,
    false,
  );
  if (input.templateSeedUsage !== "none" && antiTemplateConstraints.length === 0) {
    throw new Error("buildCandidateConcept: templateSeedUsage requires antiTemplateConstraints");
  }

  return {
    schemaVersion: "2.0",
    candidateId: input.candidateId,
    round: input.round,
    statement: input.statement,
    designThesis: input.designThesis,
    referenceLineage,
    templateSeedUsage: input.templateSeedUsage,
    antiTemplateConstraints,
    noveltyBet: input.noveltyBet,
    anchors: [...input.anchors],
    nonGoals: [...input.nonGoals],
    pivotFromPrior: input.pivotFromPrior,
  };
}

function normalizeMeaningfulStringArray(
  fieldName: string,
  values: string[],
  requireNonEmpty: boolean,
): string[] {
  const normalized = values.map((value) => value.trim());
  if (requireNonEmpty && normalized.length === 0) {
    throw new Error(`buildCandidateConcept: ${fieldName} must be non-empty`);
  }
  const invalid = normalized.find((value) => value.length === 0 || PLACEHOLDER_RE.test(value));
  if (invalid !== undefined) {
    throw new Error(`buildCandidateConcept: ${fieldName} entries must be meaningful`);
  }
  return normalized;
}

export function candidateConceptPath(round: ExplorationRound, candidateId: CandidateId): string {
  return roundCandidateArtifactPath(round, candidateId, "concept.json");
}
