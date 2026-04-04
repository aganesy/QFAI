const LEGACY_RECOMMENDATION_KEYS = [
  "recommended_mode",
  "rationale",
  "allowed_modes",
  "surface",
] as const;

/**
 * Precedence trigger is **key existence** — not value type.
 * If `prototyping` key is present (even as scalar, array, null, or boolean),
 * the namespaced contract applies and legacy fallback is forbidden.
 * Value type validation is the consumer's concern, not a precedence concern.
 */
export function hasNamespacedRecommendationBlock(
  parsed: Record<string, unknown>,
): boolean {
  return Object.prototype.hasOwnProperty.call(parsed, "prototyping");
}

/**
 * Returns true when the value is a plain object (not null, not array).
 * Use this to check whether the namespaced block is structurally valid
 * before attempting field-level validation.
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function hasLegacyRecommendationKeys(
  parsed: Record<string, unknown>,
): boolean {
  return LEGACY_RECOMMENDATION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(parsed, key),
  );
}
