/**
 * Prototyping surface helpers.
 *
 * Iteration count is fixed globally via
 * `core/prototyping/iteration.ts#MAX_ITERATIONS`.
 *
 * Kept here: surface-type helpers and a `playwright-cli` constant used by
 * the capture wiring.
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
