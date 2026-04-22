export * from "./config.js";
export * from "./atddTraceability.js";
export * from "./decisionGuardrails.js";
export * from "./ids.js";
export * from "./review/prototyping.js";
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
// Compatibility: keep non-runtime full-harness helpers on the public root export.
export { loadHistory, appendIteration, computeTerminationReason } from "./harness/history.js";
export { validateReviewer } from "./harness/reviewerIdentity.js";
export { resolveCommitSha } from "./harness/gitRevision.js";
export { REVIEWER_PLACEHOLDERS } from "./harness/types.js";
export type {
  FullHarnessAxisScore,
  FullHarnessReviewerScore,
  FullHarnessEvidenceRefs,
  FullHarnessIteration,
  FinalDecision,
  ReviewerSignoffStatus,
  ReviewerLogVerdict,
  FullHarnessScoreSnapshot,
  FullHarnessHistory,
  TerminationReason,
  MeasurementInput,
  MeasurementResult,
  FullHarnessCalibrationRef,
} from "./harness/types.js";
// WS-A: Built-in Playwright providers
export { createPlaywrightRenderAdapter } from "./evidence/playwrightRenderAdapter.js";
export { createPlaywrightBrowserQaProvider } from "./providers/playwrightBrowserQaProvider.js";
