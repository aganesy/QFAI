export const CANONICAL_PROTOTYPING_SURFACES = ["web", "mobile", "desktop", "cli", "mixed"] as const;

export type CanonicalPrototypingSurface = (typeof CANONICAL_PROTOTYPING_SURFACES)[number];

const CANONICAL_PROTOTYPING_SURFACE_SET = new Set<string>(CANONICAL_PROTOTYPING_SURFACES);
const UI_BEARING_PROTOTYPING_SURFACE_SET = new Set<CanonicalPrototypingSurface>([
  "web",
  "mobile",
  "desktop",
  "mixed",
]);

export function isCanonicalPrototypingSurface(value: string): value is CanonicalPrototypingSurface {
  return CANONICAL_PROTOTYPING_SURFACE_SET.has(value);
}

export function assertCanonicalPrototypingSurface(value: string): CanonicalPrototypingSurface {
  if (!isCanonicalPrototypingSurface(value)) {
    throw new Error(`surface field must be one of: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}.`);
  }
  return value;
}

export function isUiBearingPrototypingSurface(value: CanonicalPrototypingSurface): boolean {
  return UI_BEARING_PROTOTYPING_SURFACE_SET.has(value);
}

export const CANONICAL_SURFACES = CANONICAL_PROTOTYPING_SURFACES;
export type CanonicalSurface = CanonicalPrototypingSurface;
export const isCanonicalSurface = isCanonicalPrototypingSurface;
export const isUiBearingSurface = isUiBearingPrototypingSurface;
