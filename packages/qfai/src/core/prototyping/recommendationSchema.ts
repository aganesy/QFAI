const LEGACY_RECOMMENDATION_KEYS = [
  "recommended_mode",
  "rationale",
  "allowed_modes",
  "surface",
] as const;

export function hasNamespacedRecommendationBlock(
  parsed: Record<string, unknown>,
): boolean {
  return (
    parsed.prototyping !== null &&
    parsed.prototyping !== undefined &&
    typeof parsed.prototyping === "object" &&
    !Array.isArray(parsed.prototyping)
  );
}

export function hasLegacyRecommendationKeys(
  parsed: Record<string, unknown>,
): boolean {
  return LEGACY_RECOMMENDATION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(parsed, key),
  );
}
