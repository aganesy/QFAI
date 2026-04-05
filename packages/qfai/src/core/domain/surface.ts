export const CANONICAL_SURFACES = ["web", "mobile", "desktop", "cli", "mixed", "non-ui"] as const;

export type CanonicalSurface = (typeof CANONICAL_SURFACES)[number];

const CANONICAL_SURFACE_SET = new Set<string>(CANONICAL_SURFACES);
const UI_BEARING_SURFACE_SET = new Set<CanonicalSurface>(["web", "mobile", "desktop", "mixed"]);

export function isCanonicalSurface(value: string): value is CanonicalSurface {
  return CANONICAL_SURFACE_SET.has(value);
}

export function isUiBearingSurface(value: CanonicalSurface): boolean {
  return UI_BEARING_SURFACE_SET.has(value);
}
