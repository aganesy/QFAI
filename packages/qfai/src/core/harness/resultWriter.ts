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
    finalScore: number;
    bestIteration: number;
    decision: string;
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
  calibrationSummary: {
    thresholds: { accept: number; refine: number };
  };
  observabilityRefs: string[];
};

export function buildFullHarnessResult(
  history: FullHarnessHistory,
  renderResults: RenderRunnerResult[],
  browserQaResults: BrowserQaRunResult[],
  thresholds: { accept: number; refine: number },
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

  const lastIteration = history.iterations[history.iterations.length - 1];
  const lastDecision = lastIteration ? lastIteration.decision : "unknown";
  const finalScore = lastIteration ? lastIteration.weightedTotal : 0;

  return {
    mode: "full-harness",
    iterations: history.iterations.length,
    terminationReason: terminationReason ?? "in-progress",
    evaluationSummary: {
      finalScore,
      bestIteration: history.bestIteration,
      decision: lastDecision,
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
    calibrationSummary: {
      thresholds,
    },
    observabilityRefs,
  };
}
