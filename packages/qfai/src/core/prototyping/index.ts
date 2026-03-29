// Module: prototyping
// UI fidelity auto-generation utilities and mode resolver for qfai prototyping flow.

export {
  autogenerateUiFidelity,
  buildUiFidelityScreens,
  collectExpectedFromContracts,
  computeLabelCoverage,
  crawlRoutesAndCollectFoundLabels,
  emitUiFidelity,
  extractDomMarkers,
  runMockPaths,
} from "./uiFidelityAutogen.js";

export type {
  UiFidelityAutogenCrawlResult,
  UiFidelityAutogenExpected,
  UiFidelityAutogenMockPathResult,
  UiFidelityAutogenResult,
  UiFidelityGeneratedScreen,
  UiFidelityLabelCoverage,
} from "./uiFidelityAutogen.js";

export {
  resolveObligations,
  resolveObligationsWithOptIn,
  RUNTIME_HEAVY_CHECKS,
  STATIC_OBLIGATIONS,
} from "./modeResolver.js";

export type { PrototypingMode } from "./modeResolver.js";

export { readDiscussionRecommendation } from "./discussionReader.js";
export type { DiscussionRecommendation } from "./discussionReader.js";

export { resolvePrecedence } from "./precedenceResolver.js";
export type { ModeResolution, ModeSource, PrecedenceInput } from "./precedenceResolver.js";

export { formatModeLog, VALID_MODE_SOURCES } from "./modeLogger.js";
export type { ModeLogEntry } from "./modeLogger.js";

export { adaptSurfaceEvidence } from "./surfaceAdapter.js";
export type { SurfaceType, SurfaceEvidenceResult, SurfaceAdapterInput } from "./surfaceAdapter.js";
