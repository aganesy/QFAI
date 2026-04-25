import type { CandidateId } from "./candidate.js";

export const EXPLORATION_ROUNDS = ["r5", "r3", "r2", "r1"] as const;
export const HARVESTABLE_ROUNDS = ["r5", "r3", "r2"] as const;
export const ABSORPTION_ROUNDS = ["r3", "r2", "r1"] as const;

export type ExplorationRound = (typeof EXPLORATION_ROUNDS)[number];
export type HarvestableExplorationRound = (typeof HARVESTABLE_ROUNDS)[number];
export type AbsorptionRound = (typeof ABSORPTION_ROUNDS)[number];

export const ROUND_SURVIVOR_COUNT: Record<ExplorationRound, number> = {
  r5: 5,
  r3: 3,
  r2: 2,
  r1: 1,
};

const NEXT_ROUND_MAP: Record<HarvestableExplorationRound, AbsorptionRound> = {
  r5: "r3",
  r3: "r2",
  r2: "r1",
};

const PREVIOUS_ROUND_MAP: Record<AbsorptionRound, HarvestableExplorationRound> = {
  r3: "r5",
  r2: "r3",
  r1: "r2",
};

export function isExplorationRound(value: unknown): value is ExplorationRound {
  return typeof value === "string" && EXPLORATION_ROUNDS.includes(value as ExplorationRound);
}

export function isHarvestableExplorationRound(
  value: unknown,
): value is HarvestableExplorationRound {
  return (
    typeof value === "string" && HARVESTABLE_ROUNDS.includes(value as HarvestableExplorationRound)
  );
}

export function isAbsorptionRound(value: unknown): value is AbsorptionRound {
  return typeof value === "string" && ABSORPTION_ROUNDS.includes(value as AbsorptionRound);
}

export function nextExplorationRound(round: HarvestableExplorationRound): AbsorptionRound {
  return NEXT_ROUND_MAP[round];
}

export function previousExplorationRound(round: AbsorptionRound): HarvestableExplorationRound {
  return PREVIOUS_ROUND_MAP[round];
}

export function prototypingRoundsDir(): string {
  return ".qfai/evidence/prototyping/rounds";
}

export function roundDir(round: ExplorationRound): string {
  return `${prototypingRoundsDir()}/${round}`;
}

export function roundCandidateDir(round: ExplorationRound, candidateId: CandidateId): string {
  return `${roundDir(round)}/candidates/${candidateId}`;
}

export function roundCandidateArtifactPath(
  round: ExplorationRound,
  candidateId: CandidateId,
  fileName: string,
): string {
  return `${roundCandidateDir(round, candidateId)}/${fileName}`;
}

export function roundCandidateEvidencePath(
  round: ExplorationRound,
  candidateId: CandidateId,
  screenId: string,
  kind: "png" | "html" | "snapshot.txt" | "commands.json",
): string {
  return roundCandidateArtifactPath(round, candidateId, `${screenId}.${kind}`);
}

export function roundCommandPlansPath(round: ExplorationRound): string {
  return `${roundDir(round)}/command-plans.json`;
}

export function roundReviewBundlePath(round: ExplorationRound): string {
  return `${roundDir(round)}/review-bundle.json`;
}

export function roundEvaluatorReviewsDir(round: ExplorationRound): string {
  return `${roundDir(round)}/evaluator-reviews`;
}

export function roundEvaluatorReviewPath(
  round: ExplorationRound,
  candidateId: CandidateId,
): string {
  return `${roundEvaluatorReviewsDir(round)}/${candidateId}.json`;
}

export function roundHarvestPath(round: HarvestableExplorationRound): string {
  return `${roundDir(round)}/harvest.json`;
}

export function roundNarrowDecisionPath(round: HarvestableExplorationRound): string {
  return `${roundDir(round)}/narrow-decision.json`;
}

export function roundAbsorptionPlanPath(round: AbsorptionRound): string {
  return `${roundDir(round)}/absorption-plan.json`;
}

export function roundReimplementationPath(round: AbsorptionRound): string {
  return `${roundDir(round)}/reimplementation.json`;
}

export function candidateRoutePath(candidateId: CandidateId, route: string): string {
  const normalizedRoute = route.trim().replace(/^\/+/, "");

  if (normalizedRoute.length === 0) {
    return `/prototype/${candidateId}/`;
  }

  return `/prototype/${candidateId}/${normalizedRoute}`;
}
