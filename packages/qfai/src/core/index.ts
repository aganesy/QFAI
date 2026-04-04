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
  UI_BEARING_SURFACES,
  NON_UI_SURFACES,
  isUiBearingSurfaceType,
} from "./detection/surfaceType.js";
// WS-B: Browser QA 4-phase orchestration
export { runBrowserQaOrchestrated, summarizeBrowserQaResult } from "./browserQa/runner.js";
export { BROWSER_QA_PHASES } from "./browserQa/types.js";
// WS-C: Render evidence runner
export { runRenderCapture } from "./evidence/renderRunner.js";
export { writeEvidenceBundles } from "./evidence/bundleWriter.js";
// WS-D: Full-harness runtime
export { runFullHarness } from "./harness/runtime.js";
export type { FullHarnessRequest, FullHarnessResult } from "./harness/runtime.js";
