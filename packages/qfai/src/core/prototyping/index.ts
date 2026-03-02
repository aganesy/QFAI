// Module: prototyping
// UI fidelity auto-generation utilities for qfai prototyping flow.

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
