import type { ExplorationRound } from "./round.js";

const CANDIDATE_ID_PATTERN = /^c[1-9]\d*$/;

// Nominal/brand type. Previously this was the template-literal type
// `c${number}`, but `${number}` accepts any numeric literal including
// `c0`, `c-1`, `c1.5`, and `cNaN`, none of which the runtime regex
// CANDIDATE_ID_PATTERN allows. The brand keeps the value a plain string
// at runtime while forcing every CandidateId to flow through
// `parseCandidateIds` (the only public mint), so the type and the
// validator agree.
declare const CandidateIdBrand: unique symbol;
export type CandidateId = string & { readonly [CandidateIdBrand]: "CandidateId" };

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
