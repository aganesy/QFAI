import type { DiscussionModeRecommendation } from "./types.js";

export type RecommendationSemanticIssueCode = "QFAI-PROT-154";

export type RecommendationSemanticValidationResult =
  | { valid: true }
  | {
      valid: false;
      code: RecommendationSemanticIssueCode;
      message: string;
    };

/**
 * Shared semantic validation for discussion mode recommendations.
 *
 * This is the single source of truth for semantic invariants that apply
 * after syntactic / enum validation has passed. Both the validator
 * (`prototypingRecommendation.ts`) and the runtime parser (`mode.ts`)
 * MUST call this helper instead of duplicating the check.
 */
export function validateRecommendationSemantics(
  recommendation: Pick<DiscussionModeRecommendation, "recommendedMode" | "allowedModes">,
): RecommendationSemanticValidationResult {
  if (!recommendation.allowedModes.includes(recommendation.recommendedMode)) {
    return {
      valid: false,
      code: "QFAI-PROT-154",
      message: "recommended_mode must be included in allowed_modes",
    };
  }
  return { valid: true };
}
