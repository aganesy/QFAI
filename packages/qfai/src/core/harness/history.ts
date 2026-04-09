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

  // v1.7.15: plateau/converged require count >= plateauLookback (strict).
  // Do not use Math.min to adapt lookback to shorter history.
  if (count < calibration.plateauLookback) {
    return undefined;
  }

  const recentScores = history.iterations
    .slice(-calibration.plateauLookback)
    .map((i) => i.weightedTotal);
  const maxDelta = Math.max(...recentScores) - Math.min(...recentScores);
  if (maxDelta < calibration.plateauDelta) {
    const latestEntry = history.iterations[count - 1];
    const latestTotal = latestEntry?.weightedTotal ?? 0;
    return latestTotal >= calibration.thresholds.accept ? "converged" : "plateau";
  }

  // v1.7.15: single-iteration accept does NOT produce converged.
  // Convergence requires iterationCount >= 2 AND plateau condition.
  return undefined;
}
