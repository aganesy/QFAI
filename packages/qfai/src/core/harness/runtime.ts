/**
 * Full-harness runtime — WS-D
 *
 * Production-path entry point for `mode=full-harness`.
 * Orchestrates the planner → generator → evaluator loop with
 * render evidence, Browser QA, critique, and observability.
 */

import { isUiBearingSurfaceType } from "../detection/surfaceType.js";
import type { CritiqueAdapter } from "../critique/adapter.js";
import { createFullHarnessHandoff, type FullHarnessHandoff } from "./handoff.js";
import { detectFakeUi, type FakeUiDetectionResult } from "./fakeUiDetection.js";
import { mapLoopStatusToExitReason, type FullHarnessExitReason } from "./exitReason.js";
import { HarnessLoop } from "./loop.js";
import type { HarnessConfig, LoopResult, SpecInputs } from "./types.js";
import type { FullHarnessAdapters } from "./adapters.js";
import { buildFullHarnessResult, type FullHarnessOutput } from "./resultWriter.js";
import { generateEvidence, generateReviewSummary } from "./evidence.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";

export type FullHarnessRequest = {
  inputs: SpecInputs;
  config?: Partial<HarnessConfig>;
  adapters?: FullHarnessAdapters;
  critiqueAdapter?: CritiqueAdapter;
};

export type FullHarnessResult = {
  loopResult: LoopResult;
  output: FullHarnessOutput;
  evidence: ReturnType<typeof generateEvidence>;
  reviewSummary: ReturnType<typeof generateReviewSummary>;
  fakeUiDetection: FakeUiDetectionResult;
  exitReason: FullHarnessExitReason;
  handoff: FullHarnessHandoff;
};

/**
 * Run the full-harness mode.
 *
 * Termination policy:
 * - `accept` reached → exit
 * - `max_iterations` reached → exit
 * - plateau detected → exit
 * - hard execution failure → throw
 */
export async function runFullHarness(request: FullHarnessRequest): Promise<FullHarnessResult> {
  const { inputs, config, adapters, critiqueAdapter } = request;

  const loop = new HarnessLoop(config, critiqueAdapter);
  const loopResult = await loop.run(inputs);

  const renderResults: RenderRunnerResult[] = [];
  const browserQaResults: BrowserQaRunResult[] = [];

  const surface = adapters?.surface;
  const isUiBearing = surface ? isUiBearingSurfaceType(surface) : false;

  // Post-loop: render evidence (UI-bearing only)
  if (isUiBearing && adapters?.render) {
    try {
      const renderResult = await adapters.render.captureEvidence(loopResult.iterationCount);
      renderResults.push(renderResult);
    } catch {
      // Render capture failure is non-fatal in full-harness
    }
  }

  // Post-loop: Browser QA (UI-bearing only)
  if (isUiBearing && adapters?.browserQa) {
    try {
      const qaResult = await adapters.browserQa.runQa(loopResult.iterationCount);
      browserQaResults.push(qaResult);
    } catch {
      // Browser QA failure is non-fatal in full-harness
    }
  }

  // Observability
  if (adapters?.observability) {
    for (const iter of loopResult.iterations) {
      adapters.observability.recordIteration({
        iteration: iter.iteration,
        score: iter.evaluatorResult.weightedTotal,
        decision: iter.evaluatorResult.decision,
      });
    }
    adapters.observability.recordIteration({
      iteration: loopResult.iterationCount,
      score: loopResult.finalScore,
      decision: loopResult.status,
      terminationReason: loopResult.terminationReason,
    });
    await adapters.observability.flush();
  }

  const thresholds = config?.thresholds ?? { accept: 0.8, refine: 0.5 };
  const output = buildFullHarnessResult(loopResult, renderResults, browserQaResults, thresholds);

  const evidence = generateEvidence(loopResult);
  const reviewSummary = generateReviewSummary(loopResult);
  const fakeUiDetection = detectFakeUi({ renderResults, browserQaResults });
  const exitReason = fakeUiDetection.detected
    ? "fake-ui-detected"
    : mapLoopStatusToExitReason(loopResult.terminationReason);
  const handoff = createFullHarnessHandoff({
    selectedBuild: loopResult.finalOutput.content,
    artifactRefs: [
      `run:${evidence.runId}`,
      ...renderResults.flatMap((result) => result.filesWritten),
    ],
    exitReason,
    outstandingIssues: fakeUiDetection.reasons,
    requiredHumanReviewPoints: fakeUiDetection.detected
      ? ["Verify that the selected build performs real state and route changes."]
      : [],
  });

  return { loopResult, output, evidence, reviewSummary, fakeUiDetection, exitReason, handoff };
}
