/**
 * Iteration history management.
 *
 * Reads previous iterations from prototyping.json,
 * appends new iteration, and recomputes bestIteration/scoringTrace from
 * reviewerScores/allItemsPass95 evidence.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  FullHarnessHistory,
  FullHarnessIteration,
  FullHarnessScoreSnapshot,
  TerminationReason,
} from "./types.js";

const EVIDENCE_PATH = ".qfai/evidence/prototyping.json";

export async function loadHistory(root: string): Promise<FullHarnessHistory | null> {
  try {
    const filePath = path.join(root, EVIDENCE_PATH);
    const content = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (isRecord(parsed) && isRecord(parsed.fullHarness)) {
      const fh = parsed.fullHarness;
      if (Array.isArray(fh.iterations)) {
        return {
          runId: typeof fh.runId === "string" ? fh.runId : crypto.randomUUID(),
          iterations: fh.iterations as FullHarnessIteration[],
          bestIteration: typeof fh.bestIteration === "number" ? fh.bestIteration : 0,
          ...(typeof fh.terminationReason === "string"
            ? { terminationReason: fh.terminationReason as TerminationReason }
            : {}),
          scoringTrace: Array.isArray(fh.scoringTrace)
            ? (fh.scoringTrace as FullHarnessHistory["scoringTrace"])
            : [],
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function appendIteration(
  history: FullHarnessHistory | null,
  iteration: FullHarnessIteration,
): FullHarnessHistory {
  const existing = history ?? {
    runId: crypto.randomUUID(),
    iterations: [],
    bestIteration: 0,
    scoringTrace: [],
  };

  const newIteration: FullHarnessIteration = {
    ...iteration,
    iteration: existing.iterations.length + 1,
  };

  const iterations = [...existing.iterations, newIteration];
  const scoringTrace = iterations.map(buildScoreSnapshot);
  const bestIteration =
    scoringTrace.reduce<FullHarnessScoreSnapshot | undefined>((best, entry) => {
      if (!best || compareSnapshots(entry, best) > 0) {
        return entry;
      }
      return best;
    }, undefined)?.iteration ?? 1;

  return {
    runId: existing.runId,
    iterations,
    bestIteration,
    scoringTrace,
  };
}

/**
 * v1.7.15 WS-7: Validate structural consistency invariants.
 * iterations.length === scoringTrace.length === reviewerLogsLength (if provided)
 * Each iteration has valid evidenceRefs array.
 */
export function validateHistoryConsistency(
  history: FullHarnessHistory,
  reviewerLogsLength?: number,
): string[] {
  const errors: string[] = [];

  if (history.iterations.length !== history.scoringTrace.length) {
    errors.push(
      `History consistency violation: iterations.length (${history.iterations.length}) !== ` +
        `scoringTrace.length (${history.scoringTrace.length})`,
    );
  }

  if (reviewerLogsLength !== undefined && history.iterations.length !== reviewerLogsLength) {
    errors.push(
      `History consistency violation: iterations.length (${history.iterations.length}) !== ` +
        `reviewerLogs.length (${reviewerLogsLength})`,
    );
  }

  for (const it of history.iterations) {
    const refs = it.evidenceRefs;
    const hasEmpty = Object.values(refs).some((arr) => arr.length === 0);
    if (hasEmpty) {
      errors.push(`Iteration ${it.iteration} has empty evidenceRefs categories`);
    }
  }

  return errors;
}

export function computeTerminationReason(
  history: FullHarnessHistory,
  iterationPolicy: {
    maxIterations: number;
  },
): TerminationReason | undefined {
  const count = history.iterations.length;
  if (count === 0) {
    return undefined;
  }

  const latestIteration = history.iterations[count - 1];
  if (latestIteration?.allItemsPass95) {
    return "converged";
  }

  if (count >= iterationPolicy.maxIterations) {
    return "max-iterations";
  }

  return undefined;
}

function buildScoreSnapshot(iteration: FullHarnessIteration): FullHarnessScoreSnapshot {
  const axisScores = iteration.reviewerScores.flatMap((reviewer) =>
    reviewer.scores.map((score) => score.score),
  );
  if (axisScores.length === 0) {
    return {
      iteration: iteration.iteration,
      reviewerCount: iteration.reviewerScores.length,
      axisCount: 0,
      minScore: null,
      averageScore: null,
      allItemsPass95: iteration.allItemsPass95,
      commitSha: iteration.commitSha,
    };
  }

  const total = axisScores.reduce((sum, score) => sum + score, 0);
  return {
    iteration: iteration.iteration,
    reviewerCount: iteration.reviewerScores.length,
    axisCount: axisScores.length,
    minScore: Math.min(...axisScores),
    averageScore: total / axisScores.length,
    allItemsPass95: iteration.allItemsPass95,
    commitSha: iteration.commitSha,
  };
}

function compareSnapshots(left: FullHarnessScoreSnapshot, right: FullHarnessScoreSnapshot): number {
  if (left.allItemsPass95 !== right.allItemsPass95) {
    return left.allItemsPass95 ? 1 : -1;
  }
  const leftMin = left.minScore ?? -1;
  const rightMin = right.minScore ?? -1;
  if (leftMin !== rightMin) {
    return leftMin - rightMin;
  }
  const leftAverage = left.averageScore ?? -1;
  const rightAverage = right.averageScore ?? -1;
  if (leftAverage !== rightAverage) {
    return leftAverage - rightAverage;
  }
  return left.iteration - right.iteration;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
