import type { CandidateId } from "./candidate.js";
import type { AbsorbableCategory } from "./evaluatorReviewV2.js";
import type { AbsorptionRound, HarvestableExplorationRound } from "./round.js";
import { nextExplorationRound } from "./round.js";

export type HarvestedElement = {
  harvestId: string;
  sourceCandidateId: CandidateId;
  sourceStrengthId: string;
  category: AbsorbableCategory;
  description: string;
  rationale: string;
  evidenceRefs: string[];
};

export type HarvestRecord = {
  schemaVersion: "2.0";
  fromRound: HarvestableExplorationRound;
  toRound: AbsorptionRound;
  allCandidatesConsidered: CandidateId[];
  harvestedElements: HarvestedElement[];
};

export type BuildHarvestRecordInput = {
  fromRound: HarvestableExplorationRound;
  allCandidatesConsidered: CandidateId[];
  harvestedElements?: HarvestedElement[];
};

export function buildHarvestRecord(input: BuildHarvestRecordInput): HarvestRecord {
  return {
    schemaVersion: "2.0",
    fromRound: input.fromRound,
    toRound: nextExplorationRound(input.fromRound),
    allCandidatesConsidered: [...input.allCandidatesConsidered],
    harvestedElements: [...(input.harvestedElements ?? [])],
  };
}
