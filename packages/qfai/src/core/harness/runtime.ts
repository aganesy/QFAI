/**
 * Full-harness runtime — v1.7.15
 *
 * Measurement-driven orchestration.
 * Does NOT contain a self-modifying loop.
 * Each CLI invocation records exactly one iteration of real observation.
 *
 * v1.7.15 breaking changes:
 * - Panel scores computed from real evidence (no dummy l1/l2=0)
 * - calibration pack required (no silent fallback)
 * - reviewer required (no placeholder)
 * - commitSha required (no silent failure)
 */

import { requiresVisualBrowserEvidence } from "../detection/surfaceType.js";
import { detectFakeUi, type FakeUiDetectionResult } from "./fakeUiDetection.js";
import { mapLoopStatusToExitReason, type FullHarnessExitReason } from "./exitReason.js";
import { createFullHarnessHandoff, type FullHarnessHandoff } from "./handoff.js";
import type { FullHarnessAdapters } from "./adapters.js";
import type {
  FullHarnessHistory,
  FullHarnessIteration,
  MeasurementInput,
  TerminationReason,
  FullHarnessCalibrationRef,
  FullHarnessPanelScore,
} from "./types.js";
import { runMeasurement } from "./measurement.js";
import type { FullHarnessPanelInputs } from "./panelInputs.js";
import { scorePanelsFromInputs } from "./panelScore.js";
import type { RenderRunnerResult } from "../evidence/types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";

export type FullHarnessRequest = {
  root: string;
  reviewer: string;
  changeSummary: string[];
  limitations: string[];
  calibration: {
    packPath: string;
    packVersion: string;
    configPath: string;
    thresholds: { accept: number; refine: number };
    maxIterations: number;
    plateauDelta: number;
    plateauLookback: number;
  };
  adapters?: FullHarnessAdapters;
  panelInputs?: FullHarnessPanelInputs;
  l1?: FullHarnessPanelScore;
  l2?: FullHarnessPanelScore;
};

export type FullHarnessResult = {
  iteration: FullHarnessIteration;
  history: FullHarnessHistory;
  calibrationRef: FullHarnessCalibrationRef;
  fakeUiDetection: FakeUiDetectionResult;
  exitReason: FullHarnessExitReason;
  handoff: FullHarnessHandoff;
  terminationReason: TerminationReason | undefined;
  isTerminal: boolean;
};

/**
 * Run a single full-harness measurement iteration.
 *
 * This does NOT loop. Each invocation:
 * 1. Captures render/browserQa evidence
 * 2. Scores panels from real evidence inputs
 * 3. Appends iteration to history
 * 4. Computes termination
 */
export async function runFullHarness(request: FullHarnessRequest): Promise<FullHarnessResult> {
  const surface = request.adapters?.surface;
  const requiresVisualEvidence = surface ? requiresVisualBrowserEvidence(surface) : false;

  const renderResults: RenderRunnerResult[] = [];
  const browserQaResults: BrowserQaRunResult[] = [];
  const renderRefs: string[] = [];
  const browserQaRefs: string[] = [];

  // Capture render evidence (UI-bearing only)
  if (requiresVisualEvidence && request.adapters?.render) {
    try {
      const renderResult = await request.adapters.render.captureEvidence(1);
      renderResults.push(renderResult);
      renderRefs.push(...renderResult.filesWritten);
    } catch {
      // Render capture failure is non-fatal
    }
  }

  // Capture Browser QA evidence (UI-bearing only)
  if (requiresVisualEvidence && request.adapters?.browserQa) {
    try {
      const qaResult = await request.adapters.browserQa.runQa(1);
      browserQaResults.push(qaResult);
    } catch {
      // Browser QA failure is non-fatal
    }
  }

  // Compute panel scores from real evidence
  let l1: FullHarnessPanelScore;
  let l2: FullHarnessPanelScore;

  if (request.panelInputs) {
    const scored = scorePanelsFromInputs(request.panelInputs);
    l1 = scored.l1;
    l2 = scored.l2;
  } else if (request.l1 && request.l2) {
    // Allow pre-computed scores if explicitly provided (for testing)
    l1 = request.l1;
    l2 = request.l2;
  } else {
    throw new Error(
      "Full-harness requires either panelInputs for evidence-based scoring or explicit l1/l2 scores.",
    );
  }

  // Observability
  if (request.adapters?.observability) {
    request.adapters.observability.recordIteration({
      iteration: 1,
      score: Math.min(l1.total, l2.total),
      decision: "refine",
    });
    await request.adapters.observability.flush();
  }

  const measurementInput: MeasurementInput = {
    root: request.root,
    reviewer: request.reviewer,
    changeSummary: request.changeSummary,
    limitations: request.limitations,
    calibration: {
      packPath: request.calibration.packPath,
      thresholds: request.calibration.thresholds,
      maxIterations: request.calibration.maxIterations,
      plateauDelta: request.calibration.plateauDelta,
      plateauLookback: request.calibration.plateauLookback,
    },
    renderRefs,
    browserQaRefs,
    l1,
    l2,
  };

  const measurementResult = await runMeasurement(measurementInput);

  const calibrationRef: FullHarnessCalibrationRef = {
    configPath: request.calibration.configPath,
    packPath: request.calibration.packPath,
    packVersion: request.calibration.packVersion,
  };

  const fakeUiDetection = requiresVisualEvidence
    ? detectFakeUi({ renderResults, browserQaResults })
    : { detected: false, reasons: [], evidence_refs: [], confidence: "low" as const };

  const terminationStatus = measurementResult.terminationReason;
  const exitReason: FullHarnessExitReason = fakeUiDetection.detected
    ? "fake-ui-detected"
    : terminationStatus
      ? mapLoopStatusToExitReason(terminationStatus)
      : "human-review-required";

  const handoff = createFullHarnessHandoff({
    selectedBuild: `iteration-${measurementResult.iteration.iteration}`,
    artifactRefs: [`run:${measurementResult.history.runId}`, ...renderRefs],
    exitReason,
    outstandingIssues: [...fakeUiDetection.reasons, ...measurementResult.iteration.limitations],
    requiredHumanReviewPoints: fakeUiDetection.detected
      ? ["Verify that the selected build performs real state and route changes."]
      : [],
  });

  return {
    iteration: measurementResult.iteration,
    history: measurementResult.history,
    calibrationRef,
    fakeUiDetection,
    exitReason,
    handoff,
    terminationReason: measurementResult.terminationReason,
    isTerminal: measurementResult.isTerminal,
  };
}
