/**
 * Prototyping surface helpers (v2.0).
 *
 * The v1.x mode tier and obligation derivation were removed in spec-0017
 * P3. v2.0 fixes iteration count globally to MAX_ITERATIONS=15 in
 * `core/prototyping/iteration.ts`.
 *
 * Kept here: surface-type helpers and a `playwright-cli` constant used by
 * v2.0 capture wiring.
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
