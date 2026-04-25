import type { CandidateId } from "./candidate.js";
import type { ExplorationRound } from "./round.js";

export const ABSORBABLE_CATEGORIES = [
  "layout",
  "interaction",
  "content-hierarchy",
  "visual-language",
  "navigation",
  "motion",
] as const;

export type AbsorbableCategory = (typeof ABSORBABLE_CATEGORIES)[number];

export type ReviewAxisScore = {
  axisId: string;
  score: number;
  rationale: string;
  evidenceRefs: string[];
};

export type StrengthEntry = {
  id: string;
  category: AbsorbableCategory;
  description: string;
  screenRefs: string[];
  evidenceRefs: string[];
};

export type WeaknessEntry = {
  id: string;
  category: AbsorbableCategory;
  description: string;
  severity: "blocking" | "major" | "minor";
  evidenceRefs: string[];
};

export type ConceptFitAssessment = {
  overallScore: number;
  rationale: string;
  anchorsFromExplorationBrief: string[];
  divergences: string[];
  evidenceRefs: string[];
  priorRoundScore: number | null;
  regressionAlert: boolean;
};

export type CoherenceFinding = {
  id: string;
  description: string;
  absorptionRefs: string[];
  severity: "blocking" | "major" | "minor";
  evidenceRefs: string[];
};

export type EvaluatorReviewV2 = {
  schemaVersion: "2.0";
  candidateId: CandidateId;
  round: ExplorationRound;
  reviewerId: string;
  perAxis: ReviewAxisScore[];
  strengths: StrengthEntry[];
  weaknesses: WeaknessEntry[];
  conceptFit: ConceptFitAssessment;
  coherenceFindings: CoherenceFinding[];
};

export type BuildEvaluatorReviewV2Input = Omit<
  EvaluatorReviewV2,
  "schemaVersion" | "conceptFit"
> & {
  conceptFit: Omit<ConceptFitAssessment, "regressionAlert"> & {
    regressionThreshold?: number;
  };
};

export function calculateRegressionAlert(
  overallScore: number,
  priorRoundScore: number | null,
  regressionThreshold = 5,
): boolean {
  if (priorRoundScore === null) {
    return false;
  }

  return overallScore < priorRoundScore - regressionThreshold;
}

export function buildEvaluatorReviewV2(input: BuildEvaluatorReviewV2Input): EvaluatorReviewV2 {
  if (input.strengths.length < 3) {
    throw new Error("buildEvaluatorReviewV2: strengths must contain at least 3 entries");
  }

  const {
    regressionThreshold = 5,
    overallScore,
    priorRoundScore,
    rationale,
    anchorsFromExplorationBrief,
    divergences,
    evidenceRefs,
  } = input.conceptFit;

  return {
    schemaVersion: "2.0",
    candidateId: input.candidateId,
    round: input.round,
    reviewerId: input.reviewerId,
    perAxis: [...input.perAxis],
    strengths: [...input.strengths],
    weaknesses: [...input.weaknesses],
    conceptFit: {
      overallScore,
      rationale,
      anchorsFromExplorationBrief: [...anchorsFromExplorationBrief],
      divergences: [...divergences],
      evidenceRefs: [...evidenceRefs],
      priorRoundScore,
      regressionAlert: calculateRegressionAlert(overallScore, priorRoundScore, regressionThreshold),
    },
    coherenceFindings: [...input.coherenceFindings],
  };
}
