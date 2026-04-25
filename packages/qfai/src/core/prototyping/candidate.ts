import type { ExplorationRound } from "./round.js";

const CANDIDATE_ID_PATTERN = /^c[1-9]\d*$/;

export type CandidateId = `c${number}`;

export type Candidate = {
  candidateId: CandidateId;
  firstRound: ExplorationRound;
  droppedAtRound: ExplorationRound | null;
};

export function isCandidateId(value: unknown): value is CandidateId {
  return typeof value === "string" && CANDIDATE_ID_PATTERN.test(value);
}

export function parseCandidateIds(values: Iterable<string>): CandidateId[] {
  const candidateIds: CandidateId[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!isCandidateId(value)) {
      throw new Error(`parseCandidateIds: invalid candidateId "${value}"`);
    }
    if (seen.has(value)) {
      throw new Error(`parseCandidateIds: duplicate candidateId "${value}"`);
    }
    seen.add(value);
    candidateIds.push(value);
  }

  return candidateIds;
}

export function buildCandidates(
  candidateIds: readonly CandidateId[],
  firstRound: ExplorationRound,
): Candidate[] {
  return candidateIds.map((candidateId) => ({
    candidateId,
    firstRound,
    droppedAtRound: null,
  }));
}

export function markDroppedCandidates(
  candidates: readonly Candidate[],
  survivors: readonly CandidateId[],
  droppedAtRound: ExplorationRound,
): Candidate[] {
  const survivorSet = new Set<string>(survivors);

  return candidates.map((candidate) => {
    if (candidate.droppedAtRound !== null || survivorSet.has(candidate.candidateId)) {
      return candidate;
    }

    return {
      ...candidate,
      droppedAtRound,
    };
  });
}
