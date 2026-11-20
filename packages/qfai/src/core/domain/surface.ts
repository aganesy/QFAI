export const CANONICAL_PROTOTYPING_SURFACES = ["web", "mobile", "desktop", "cli", "mixed"] as const;

export type CanonicalPrototypingSurface = (typeof CANONICAL_PROTOTYPING_SURFACES)[number];

const CANONICAL_PROTOTYPING_SURFACE_SET = new Set<string>(CANONICAL_PROTOTYPING_SURFACES);

export function isCanonicalPrototypingSurface(value: string): value is CanonicalPrototypingSurface {
  return CANONICAL_PROTOTYPING_SURFACE_SET.has(value);
}

export function assertCanonicalPrototypingSurface(value: string): CanonicalPrototypingSurface {
  if (!isCanonicalPrototypingSurface(value)) {
    throw new Error(`surface field must be one of: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}.`);
  }
  return value;
}

/** Every canonical surface is discussion UI-bearing. */
export function isDiscussionUiBearingPrototypingSurface(
  value: CanonicalPrototypingSurface,
): boolean {
  return isCanonicalPrototypingSurface(value);
}

export function isPrototypingSurface(value: string): value is CanonicalPrototypingSurface {
  return isCanonicalPrototypingSurface(value);
}

/**
 * Discussion UI-bearing and visual/browser evidence are intentionally separate.
 * CLI is discussion UI-bearing, but only web/mobile/desktop/mixed require visual/browser evidence.
 */
export function requiresVisualBrowserEvidenceSurface(value: CanonicalPrototypingSurface): boolean {
  return value !== "cli" && isDiscussionUiBearingPrototypingSurface(value);
}

export const CANONICAL_SURFACES = CANONICAL_PROTOTYPING_SURFACES;
export type CanonicalSurface = CanonicalPrototypingSurface;
export const isCanonicalSurface = isCanonicalPrototypingSurface;
