export type PrototypingMode = "low-cost" | "standard" | "full-harness";

export type ModeSelectionSource = "explicit-request" | "discussion-recommendation" | "default";

export type PrototypingSurface = "web-ui" | "mobile-ui" | "desktop-ui" | "mixed" | "non-ui";

export type DiscussionModeRecommendation = {
  recommendedMode: PrototypingMode;
  rationale: string;
  allowedModes?: PrototypingMode[] | undefined;
  surface?: PrototypingSurface | undefined;
  updatedAt?: string | undefined;
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
};
