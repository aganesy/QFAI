export type PrototypingMode = "low-cost" | "standard" | "full-harness";

export type ModeSelectionSource = "explicit-request" | "discussion-recommendation" | "default";

export type PrototypingSurface = "web" | "mobile" | "desktop" | "cli" | "mixed" | "non-ui";

/** @deprecated Legacy surface values — use canonical PrototypingSurface instead */
export type LegacyPrototypingSurface = "web-ui" | "mobile-ui" | "desktop-ui";

export type DiscussionRecommendationSourceSchema =
  | "canonical-namespaced"
  | "legacy-top-level";

/**
 * Canonical validated recommendation — all 4 fields required.
 * Parser output uses this same type; fields are always populated
 * because extractRecommendation returns null when any field is missing.
 */
export type DiscussionModeRecommendation = {
  recommendedMode: PrototypingMode;
  rationale: string;
  allowedModes: PrototypingMode[];
  surface: PrototypingSurface;
  updatedAt?: string | undefined;
  sourceSchema?: DiscussionRecommendationSourceSchema | undefined;
};

export type ModeResolutionInput = {
  explicitMode?: PrototypingMode | undefined;
  discussionRecommendation?: DiscussionModeRecommendation | null | undefined;
  defaultMode?: PrototypingMode | undefined;
};

export type ModeResolutionResult = {
  requested?: PrototypingMode | undefined;
  effective: PrototypingMode;
  source: ModeSelectionSource;
  rationale: string;
};

export type ResolvedModeSummary = ModeResolutionResult & {
  discussionRecommendation?: DiscussionModeRecommendation | undefined;
  surface?: PrototypingSurface | undefined;
  warnings: string[];
};

export type PrototypingObligations = {
  requireRuntimeGate: boolean;
  requireUiFidelity: boolean;
  requireRenderBundle: boolean;
  requireBrowserQaBundle: boolean;
  requireFullHarness: boolean;
};

export type ResolveModeInput = {
  requested?: PrototypingMode | undefined;
  discussionArtifact?: unknown;
  defaultMode?: PrototypingMode | undefined;
};
