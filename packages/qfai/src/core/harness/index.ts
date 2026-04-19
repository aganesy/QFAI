export { runMeasurement } from "./measurement.js";
export {
  computeWeightedTotal,
  determineDecision,
  validatePanelScore,
  scoreL1,
  scoreL2,
  scorePanelsFromInputs,
} from "./panelScore.js";
export { loadHistory, appendIteration, computeTerminationReason } from "./history.js";
export { validateReviewer } from "./reviewerIdentity.js";
export { resolveCommitSha } from "./gitRevision.js";
export { runFullHarness } from "./runtime.js";
export type { FullHarnessRequest, FullHarnessResult } from "./runtime.js";
export { buildFullHarnessResult } from "./resultWriter.js";
export type { FullHarnessOutput } from "./resultWriter.js";
export { validatePanelInputs, MeasurementError } from "./panelInputs.js";
export type {
  FullHarnessPanelInputs,
  RuntimeGateEvidence,
  RenderEvidenceSummary,
  BrowserQaSummary,
  UiObservationSummary,
  SpecCoverageSummary,
  DiscussionAxisInputs,
  ScreenContractInputs,
  TrendAlignmentInputs,
} from "./panelInputs.js";
export type {
  FullHarnessAdapters,
  HarnessRenderAdapter,
  HarnessBrowserQaAdapter,
  HarnessObservabilityAdapter,
} from "./adapters.js";
export type {
  FullHarnessPanelScore,
  FullHarnessIteration,
  FullHarnessHistory,
  TerminationReason,
  MeasurementInput,
  MeasurementResult,
  FullHarnessCalibrationRef,
} from "./types.js";
export { REVIEWER_PLACEHOLDERS } from "./types.js";
