/**
 * Prototyping surface helpers (v2.0).
 *
 * v1.x mode (low-cost / standard / full-harness) and obligation derivation
 * are removed in P3 (spec-0017). v2.0 fixes iteration count globally to
 * MAX_ITERATIONS=15 in `core/prototyping/iteration.ts` (lands in P5).
 *
 * Kept here: surface-type helpers and a `playwright-cli` constant used by
 * v2.0 capture wiring (P5/P6).
 */

import {
  CANONICAL_PROTOTYPING_SURFACES,
  isCanonicalPrototypingSurface,
  type CanonicalPrototypingSurface,
} from "../domain/surface.js";

export const PROTOTYPING_SUPPORTED_SURFACES = ["web", "mobile", "desktop", "mixed"] as const;

export type PrototypingSurface = CanonicalPrototypingSurface;
export type PrototypingBrowserTool = "playwright-cli";

const VALID_SURFACE_SET = new Set<string>(CANONICAL_PROTOTYPING_SURFACES);
const SUPPORTED_SURFACE_SET = new Set<string>(PROTOTYPING_SUPPORTED_SURFACES);

export function isValidPrototypingSurface(value: unknown): value is PrototypingSurface {
  return (
    typeof value === "string" &&
    VALID_SURFACE_SET.has(value) &&
    isCanonicalPrototypingSurface(value)
  );
}

export function isSupportedPrototypingSurface(surface: string): surface is PrototypingSurface {
  return SUPPORTED_SURFACE_SET.has(surface);
}
