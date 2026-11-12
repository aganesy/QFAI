export * from "./config.js";
export * from "./atddTraceability.js";
export * from "./ids.js";
export * from "./preflight/sddPreflight.js";
export * from "./report.js";
export * from "./types.js";
export * from "./validate.js";
export * from "./version.js";
export * from "./validators/contracts.js";

// DESIGN.md brand SSOT primitives, exposed on the public `qfai` entry so
// consumer projects can parse and check root `DESIGN.md` without reaching
// into the monorepo source layout.
export {
  parseDesignMd,
  validateDesignMd,
  isUnreplacedDesignMdSample,
  DESIGN_MD_SAMPLE_MARKER,
  ARCHETYPES,
  COLOR_KEYS,
  FONT_KEYS,
  RADIUS_KEYS,
  SHADOW_KEYS,
} from "./design/designMd.js";
export type {
  DesignMd,
  DesignMdColors,
  DesignMdFonts,
  DesignMdRadius,
  DesignMdShadow,
  Archetype,
  ColorKey,
  FontKey,
  RadiusKey,
  ShadowKey,
  ParseError,
  ParseResult,
  ValidationIssue,
} from "./design/designMd.js";
export { prepareGraphIntegration } from "./graph/integration.js";
export { renderGraphPreparation } from "./graph/presentation.js";
export { prepareDocumentAnalysis } from "./graph/documents.js";
export type {
  ApproveExternalProcessing,
  ExternalProcessingRequest,
  DocumentPreparation,
} from "./graph/documents.js";
