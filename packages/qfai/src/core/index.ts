export * from "./config.js";
export * from "./atddTraceability.js";
export * from "./decisionGuardrails.js";
export * from "./ids.js";
export * from "./prototyping/mode.js";
export * from "./prototyping/types.js";
export * from "./prototyping/execution.js";
export * from "./preflight/sddPreflight.js";
export * from "./report.js";
export * from "./types.js";
export * from "./validate.js";
export * from "./version.js";
export * from "./validators/contracts.js";
export * from "./validators/ids.js";
export * from "./validators/atddCodeTraceability.js";
export * from "./validators/layeredTraceability.js";
export * from "./validators/orphanProhibition.js";
export * from "./validators/specSplitByCapability.js";
export * from "./validators/traceability.js";

// WS-A: Canonical surface type detection (shared truth)
export {
  DISCUSSION_UI_BEARING_SURFACES,
  DISCUSSION_NON_UI_SURFACES,
  VISUAL_BROWSER_SURFACES,
  isDiscussionUiBearingSurfaceType,
  isNonUiDiscussionSurface,
  requiresVisualBrowserEvidence,
} from "./detection/surfaceType.js";
// WS-B: Browser QA 4-phase orchestration
export { runBrowserQaOrchestrated, summarizeBrowserQaResult } from "./browserQa/runner.js";
export { BROWSER_QA_PHASES } from "./browserQa/types.js";
// WS-C: Render evidence runner
export { runRenderCapture } from "./evidence/renderRunner.js";
export { writeEvidenceBundles } from "./evidence/bundleWriter.js";
// WS-D: Full-harness runtime (v1.7.15 measurement-driven)
export { runFullHarness } from "./harness/runtime.js";
export type { FullHarnessRequest, FullHarnessResult } from "./harness/runtime.js";
// rev11 breaking change: `runMeasurement` and `validatePanelScore` are
// intentionally NOT re-exported here. They remain as internal helpers under
// `./harness/` so that the package public surface only exposes strict
// production-path APIs (`runFullHarness`, validators, canonical builders).
export { computeWeightedTotal, determineDecision } from "./harness/panelScore.js";
export { loadHistory, appendIteration, computeTerminationReason } from "./harness/history.js";
export { validateReviewer } from "./harness/reviewerIdentity.js";
export { resolveCommitSha } from "./harness/gitRevision.js";
export { REVIEWER_PLACEHOLDERS } from "./harness/types.js";
export type {
  FullHarnessPanelScore,
  FullHarnessIteration,
  FullHarnessHistory,
  TerminationReason,
  MeasurementInput,
  MeasurementResult,
  FullHarnessCalibrationRef,
} from "./harness/types.js";
// WS-A: Built-in Playwright providers
export { createPlaywrightRenderAdapter } from "./evidence/playwrightRenderAdapter.js";
export { createPlaywrightBrowserQaProvider } from "./providers/playwrightBrowserQaProvider.js";
