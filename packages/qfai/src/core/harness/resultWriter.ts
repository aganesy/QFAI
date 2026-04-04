/**
 * Harness result writer — WS-D
 *
 * Writes full-harness execution results to a structured output.
 */

import type { LoopResult } from "./types.js";
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
    phasesSkipped: number;
    totalFindings: number;
  };
  calibrationSummary: {
    thresholds: { accept: number; refine: number };
  };
  observabilityRefs: string[];
};

export function writeFullHarnessResult(
  loopResult: LoopResult,
  renderResults: RenderRunnerResult[],
  browserQaResults: BrowserQaRunResult[],
  thresholds: { accept: number; refine: number },
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
  let totalFindings = 0;
  for (const bqa of browserQaResults) {
    for (const phase of bqa.phases) {
      if (phase.status === "executed") phasesExecuted++;
      else phasesSkipped++;
      totalFindings += phase.findings.length;
    }
  }

  const lastDecision = loopResult.iterations.length > 0
    ? loopResult.iterations[loopResult.iterations.length - 1].evaluatorResult.decision
    : "unknown";

  return {
    mode: "full-harness",
    iterations: loopResult.iterationCount,
    terminationReason: loopResult.terminationReason,
    evaluationSummary: {
      finalScore: loopResult.finalScore,
      bestIteration: loopResult.bestIteration,
      decision: lastDecision,
    },
    evidenceSummary: {
      renderCaptured: renderCounts.captured,
      renderSkipped: renderCounts.skipped,
      renderFailed: renderCounts.failed,
    },
    browserQaSummary: {
      phasesExecuted,
      phasesSkipped,
      totalFindings,
    },
    calibrationSummary: {
      thresholds,
    },
    observabilityRefs,
  };
}
