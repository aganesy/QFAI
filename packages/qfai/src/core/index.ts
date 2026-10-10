export * from "./config.js";
export * from "./atddTraceability.js";
export * from "./ids.js";
export * from "./preflight/sddPreflight.js";
export * from "./report.js";
export * from "./types.js";
export * from "./validate.js";
export * from "./version.js";
export * from "./validators/contracts.js";

// Canonical surface type detection (shared truth)
export {
  DISCUSSION_UI_BEARING_SURFACES,
  DISCUSSION_NON_UI_SURFACES,
  VISUAL_BROWSER_SURFACES,
  isDiscussionUiBearingSurfaceType,
  isNonUiDiscussionSurface,
  requiresVisualBrowserEvidence,
} from "./detection/surfaceType.js";
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
