/**
 * Iteration history management — v1.7.15
 *
 * Reads previous iterations from prototyping.json,
 * appends new iteration, recomputes bestIteration/scoringTrace/terminationReason.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FullHarnessHistory, FullHarnessIteration, TerminationReason } from "./types.js";

const EVIDENCE_PATH = ".qfai/evidence/prototyping.json";

export async function loadHistory(root: string): Promise<FullHarnessHistory | null> {
  try {
    const filePath = path.join(root, EVIDENCE_PATH);
    const content = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "fullHarness" in parsed &&
      typeof (parsed as Record<string, unknown>).fullHarness === "object"
    ) {
      const fh = (parsed as { fullHarness: Record<string, unknown> }).fullHarness;
      if (Array.isArray(fh.iterations)) {
        return {
          runId: typeof fh.runId === "string" ? fh.runId : crypto.randomUUID(),
          iterations: fh.iterations as FullHarnessIteration[],
          bestIteration: typeof fh.bestIteration === "number" ? fh.bestIteration : 0,
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

  const lastExisting = existing.iterations[existing.iterations.length - 1];
  const previousTotal = lastExisting !== undefined ? lastExisting.weightedTotal : null;
  newIteration.deltaFromPrevious =
    previousTotal !== null ? newIteration.weightedTotal - previousTotal : null;

  const iterations = [...existing.iterations, newIteration];

  const bestIteration = iterations.reduce((best, it) => {
    const bestEntry = iterations[best - 1];
    return bestEntry !== undefined && it.weightedTotal > bestEntry.weightedTotal
      ? it.iteration
      : best;
  }, iterations[0]?.iteration ?? 1);

  const scoringTrace = iterations.map((it) => ({
    iteration: it.iteration,
    l1Total: it.l1.total,
    l2Total: it.l2.total,
    weightedTotal: it.weightedTotal,
    deltaFromPrevious: it.deltaFromPrevious,
    decision: it.decision,
    commitSha: it.commitSha,
  }));

  return {
    runId: existing.runId,
    iterations,
    bestIteration,
    scoringTrace,
  };
}

export function computeTerminationReason(
  history: FullHarnessHistory,
  calibration: {
    maxIterations: number;
    plateauDelta: number;
    plateauLookback: number;
    thresholds: { accept: number };
  },
): TerminationReason | undefined {
  const count = history.iterations.length;
  if (count === 0) return undefined;

  if (count >= calibration.maxIterations) return "max-iterations";

  if (count >= 2) {
    const lookback = Math.min(calibration.plateauLookback, count);
    const recentScores = history.iterations.slice(-lookback).map((i) => i.weightedTotal);
    const maxDelta = Math.max(...recentScores) - Math.min(...recentScores);
    if (maxDelta < calibration.plateauDelta) {
      const latestEntry = history.iterations[count - 1];
      const latestTotal = latestEntry?.weightedTotal ?? 0;
      return latestTotal >= calibration.thresholds.accept ? "converged" : "plateau";
    }
  }

  // Check if latest iteration meets accept threshold
  const latest = history.iterations[count - 1];
  if (latest?.decision === "accept") return "converged";

  return undefined;
}
