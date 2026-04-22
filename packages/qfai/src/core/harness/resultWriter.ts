/**
 * Harness result writer — v1.7.15
 *
 * Writes full-harness execution results to a structured output.
 * Updated for measurement-driven model (no LoopResult).
 */

import type { FullHarnessHistory, TerminationReason } from "./types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";

export type FullHarnessOutput = {
  mode: "full-harness";
  iterations: number;
  terminationReason: string;
  evaluationSummary: {
    allItemsPass95: boolean;
    bestIteration: number;
    minScore: number | null;
    averageScore: number | null;
    reviewerCount: number;
    axisCount: number;
  };
  evidenceSummary: {
    renderCaptured: number;
    renderSkipped: number;
    renderFailed: number;
  };
  browserQaSummary: {
    phasesExecuted: number;
    phasesFailed: number;
    phasesSkipped: number;
    totalFindings: number;
  };
  iterationBudget: {
    maxIterations: number;
    remainingIterations: number;
  };
  observabilityRefs: string[];
};

export function buildFullHarnessResult(
  history: FullHarnessHistory,
  renderResults: RenderRunnerResult[],
  browserQaResults: BrowserQaRunResult[],
  maxIterations: number,
  terminationReason?: TerminationReason,
  observabilityRefs: string[] = [],
): FullHarnessOutput {
  const renderCounts = { captured: 0, skipped: 0, failed: 0 };
  for (const rr of renderResults) {
    for (const entry of rr.entries) {
      if (entry.status === "captured") renderCounts.captured++;
      else if (entry.status === "skipped") renderCounts.skipped++;
      else renderCounts.failed++;
    }
  }

  let phasesExecuted = 0;
  let phasesSkipped = 0;
  let phasesFailed = 0;
  let totalFindings = 0;
  for (const bqa of browserQaResults) {
    for (const phase of bqa.phases) {
      if (phase.status === "executed") phasesExecuted++;
      else if (phase.status === "failed") phasesFailed++;
      else phasesSkipped++;
      totalFindings += phase.findings.length;
    }
  }

  const latestSnapshot = history.scoringTrace[history.scoringTrace.length - 1];

  return {
    mode: "full-harness",
    iterations: history.iterations.length,
    terminationReason: terminationReason ?? "in-progress",
    evaluationSummary: {
      allItemsPass95: latestSnapshot?.allItemsPass95 ?? false,
      bestIteration: history.bestIteration,
      minScore: latestSnapshot?.minScore ?? null,
      averageScore: latestSnapshot?.averageScore ?? null,
      reviewerCount: latestSnapshot?.reviewerCount ?? 0,
      axisCount: latestSnapshot?.axisCount ?? 0,
    },
    evidenceSummary: {
      renderCaptured: renderCounts.captured,
      renderSkipped: renderCounts.skipped,
      renderFailed: renderCounts.failed,
    },
    browserQaSummary: {
      phasesExecuted,
      phasesFailed,
      phasesSkipped,
      totalFindings,
    },
    iterationBudget: {
      maxIterations,
      remainingIterations: Math.max(0, maxIterations - history.iterations.length),
    },
    observabilityRefs,
  };
}
