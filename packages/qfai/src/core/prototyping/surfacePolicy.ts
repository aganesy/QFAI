import type { PrototypingSurface } from "./types.js";

export const PROTOTYPING_SUPPORTED_SURFACES = ["web", "mobile", "desktop", "mixed"] as const;

const PROTOTYPING_SUPPORTED_SURFACE_SET = new Set<string>(PROTOTYPING_SUPPORTED_SURFACES);

export function isSupportedPrototypingSurface(surface: string): surface is PrototypingSurface {
  return PROTOTYPING_SUPPORTED_SURFACE_SET.has(surface);
}

export function assertSupportedPrototypingSurface(surface: string): PrototypingSurface {
  if (!isSupportedPrototypingSurface(surface)) {
    throw new Error(
      `packages/qfai v1.7.15 supports prototyping only for UI-bearing surfaces: ${getSupportedPrototypingSurfacesLabel()}.`,
    );
  }
  return surface;
}

export function getSupportedPrototypingSurfacesLabel(): string {
  return PROTOTYPING_SUPPORTED_SURFACES.join(", ");
}
