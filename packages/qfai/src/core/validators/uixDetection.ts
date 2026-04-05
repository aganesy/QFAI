/**
 * UIX-VAL UI-bearing spec detection.
 *
 * Delegates to the shared surface type detection module (spec-0035).
 *
 * BR-0027-0001, BR-0027-0002, BR-0027-0012
 */
import { isUiBearingSurface } from "../detection/surfaceType.js";

/**
 * Determine if a spec/discussion pack is UI-bearing using the shared
 * detection module (surface-primary with content-fallback).
 *
 * @param root - Root directory of the spec or discussion pack
 * @returns true if UI-bearing, false otherwise
 */
export async function isUiBearingSpec(root: string): Promise<boolean> {
  return isUiBearingSurface(root);
}
