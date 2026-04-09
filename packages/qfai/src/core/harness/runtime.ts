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
} from "./types.js";
import { runMeasurement } from "./measurement.js";
import type { FullHarnessPanelInputs } from "./panelInputs.js";
import { validatePanelInputs } from "./panelInputs.js";
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
  panelInputs: FullHarnessPanelInputs;
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
  const adapters = request.adapters;
  const surface = adapters?.surface;
  const requiresVisualEvidence = surface ? requiresVisualBrowserEvidence(surface) : false;

  if (requiresVisualEvidence && !adapters?.render) {
    throw new Error("Full-harness requires a render adapter for UI-bearing surfaces.");
  }
  if (requiresVisualEvidence && !adapters?.browserQa) {
    throw new Error("Full-harness requires a browser QA adapter for UI-bearing surfaces.");
  }

  const renderResults: RenderRunnerResult[] = [];
  const browserQaResults: BrowserQaRunResult[] = [];
  const renderRefs: string[] = [];
  const browserQaRefs: string[] = [];

  if (requiresVisualEvidence && adapters?.render) {
    const renderResult = await adapters.render.captureEvidence(1);
    renderResults.push(renderResult);
    renderRefs.push(...renderResult.filesWritten);
    const hasCapturedRender = renderResult.entries.some((entry) => entry.status === "captured");
    const hasRenderFailure = renderResult.entries.some((entry) => entry.status === "failed");
    if (!hasCapturedRender || hasRenderFailure) {
      throw new Error("Full-harness requires successful render capture for UI-bearing surfaces.");
    }
  }

  if (requiresVisualEvidence && adapters?.browserQa) {
    const qaResult = await adapters.browserQa.runQa(1);
    browserQaResults.push(qaResult);
    const hasExecutedPhase = qaResult.phases.some(
      (phase) => phase.status === "executed" || phase.status === "passed",
    );
    const hasBrowserQaFailure = qaResult.phases.some((phase) => phase.status === "failed");
    if (!hasExecutedPhase || hasBrowserQaFailure) {
      throw new Error(
        "Full-harness requires successful browser QA execution for UI-bearing surfaces.",
      );
    }
  }

  // Validate and score panels from real evidence inputs only
  validatePanelInputs(request.panelInputs);
  const scored = scorePanelsFromInputs(request.panelInputs);
  const l1 = scored.l1;
  const l2 = scored.l2;

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
    runtimeGateRefs: request.panelInputs.runtimeGate.evidenceRefs,
    uiObservationRefs: request.panelInputs.uiObservation.evidenceRefs,
    specCoverageRefs: request.panelInputs.specCoverage.evidenceRefs,
    discussionRefs: request.panelInputs.discussionAxes.evidenceRefs,
    screenContractRefs: request.panelInputs.screenContract.evidenceRefs,
    trendRefs: request.panelInputs.trendAlignment.evidenceRefs,
    l1,
    l2,
  };

  const measurementResult = await runMeasurement(measurementInput);

  if (adapters?.observability) {
    adapters.observability.recordIteration({
      iteration: measurementResult.iteration.iteration,
      score: measurementResult.iteration.weightedTotal,
      decision: measurementResult.iteration.decision,
    });
    await adapters.observability.flush();
  }

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
