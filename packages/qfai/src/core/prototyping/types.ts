import type { CanonicalPrototypingSurface } from "../domain/surface.js";

export type PrototypingMode = "low-cost" | "standard" | "full-harness";

export type ModeSelectionSource =
  | "explicit-request"
  | "discussion-recommendation"
  | "system-default";

export type PrototypingSurface = CanonicalPrototypingSurface;

export type DiscussionRecommendationSourceSchema = "canonical-namespaced";

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

export type PrototypingExecutionConfig = {
  targetUrl?: string | null;
  browserProvider?: string;
  renderProvider?: string;
};

export type UiFidelityStatus = {
  required: boolean;
  status: "completed" | "failed" | "n/a";
  reason?: string;
};
