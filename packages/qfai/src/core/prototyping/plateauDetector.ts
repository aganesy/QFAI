import type { BreakthroughConfig } from "../calibration/types.js";

export type PlateauSnapshot = {
  iteration: number;
  averageScore: number | null;
  minScore: number | null;
  allReviewerAxesPerfect100: boolean;
  commitSha: string;
};

export type BreakthroughDecision = {
  triggerResult: boolean;
  triggerReasons: string[];
  latestIteration: number;
  avgScoreDeltas: number[];
  minScoreDeltas: number[];
  scoreDeltaWindow: number;
  diffLines: number;
};

export function detectBreakthrough(input: {
  scoringTrace: PlateauSnapshot[];
  diffLines: number;
  plateauDelta: number;
  plateauLookback: number;
  breakthrough: BreakthroughConfig;
}): BreakthroughDecision {
  const latest = input.scoringTrace[input.scoringTrace.length - 1];
  const avgScoreDeltas = computeDeltas(input.scoringTrace, "averageScore");
  const minScoreDeltas = computeDeltas(input.scoringTrace, "minScore");
  const recentAvgDeltas = avgScoreDeltas.slice(-input.plateauLookback);

  const reasons: string[] = [];
  const enoughIterations =
    input.scoringTrace.length >= input.breakthrough.minIterationsBeforeBranch;
  if (!enoughIterations) {
    reasons.push("insufficient-iterations");
  }
  if (!latest) {
    reasons.push("no-snapshots");
  } else if (latest.allReviewerAxesPerfect100) {
    reasons.push("already-converged");
  }
  if (recentAvgDeltas.length < input.plateauLookback) {
    reasons.push("insufficient-lookback");
  }
  if (recentAvgDeltas.length === input.plateauLookback) {
    const hasRegression = recentAvgDeltas.some((delta) => delta < 0);
    const isPlateau = recentAvgDeltas.every((delta) => delta >= 0 && delta < input.plateauDelta);
    if (hasRegression) {
      reasons.push("score-regressing");
    } else if (!isPlateau) {
      reasons.push("score-still-improving");
    }
  }
  if (input.diffLines >= input.breakthrough.maxDiffLines) {
    reasons.push("code-change-too-large");
  }

  return {
    triggerResult: reasons.length === 0,
    triggerReasons: reasons,
    latestIteration: latest?.iteration ?? 0,
    avgScoreDeltas,
    minScoreDeltas,
    scoreDeltaWindow: input.plateauLookback,
    diffLines: input.diffLines,
  };
}

function computeDeltas(
  scoringTrace: PlateauSnapshot[],
  key: "averageScore" | "minScore",
): number[] {
  const deltas: number[] = [];
  for (let index = 1; index < scoringTrace.length; index += 1) {
    const current = scoringTrace[index]?.[key];
    const previous = scoringTrace[index - 1]?.[key];
    if (current === null || previous === null || current === undefined || previous === undefined) {
      continue;
    }
    deltas.push(current - previous);
  }
  return deltas;
}
