import {
  CANONICAL_PROTOTYPING_SURFACES,
  isCanonicalPrototypingSurface,
  type CanonicalPrototypingSurface,
} from "../domain/surface.js";

export const PROTOTYPING_MODES = ["low-cost", "standard", "full-harness"] as const;
export const DEFAULT_PROTOTYPING_MODE = "standard" as const;
export const PROTOTYPING_MAX_ITERATIONS = {
  "low-cost": 1,
  standard: 3,
  "full-harness": 20,
} as const;
export const PROTOTYPING_SUPPORTED_SURFACES = ["web", "mobile", "desktop", "mixed"] as const;

export type PrototypingMode = (typeof PROTOTYPING_MODES)[number];
export type ModeSelectionSource = "explicit-request" | "system-default";
export type PrototypingSurface = CanonicalPrototypingSurface;

export type ModeResolutionResult = {
  requested?: PrototypingMode;
  effective: PrototypingMode;
  source: ModeSelectionSource;
  rationale: string;
};

export type PrototypingObligations = {
  requireRuntimeGate: boolean;
  requireUiFidelity: boolean;
  requireRenderBundle: boolean;
  requireBrowserQaBundle: boolean;
  requireIterations: boolean;
  maxIterations: number;
  validCombination: boolean;
  invalidReason?: string;
};

export type UiFidelityStatus = {
  required: boolean;
  status: "completed" | "failed" | "insufficient-evidence" | "n/a";
  reason?: string;
};

const VALID_MODE_SET = new Set<string>(PROTOTYPING_MODES);
const VALID_SURFACE_SET = new Set<string>(CANONICAL_PROTOTYPING_SURFACES);
const SUPPORTED_SURFACE_SET = new Set<string>(PROTOTYPING_SUPPORTED_SURFACES);

export function isValidPrototypingMode(value: unknown): value is PrototypingMode {
  return typeof value === "string" && VALID_MODE_SET.has(value);
}

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

export function resolvePrototypingMode(requested?: PrototypingMode): ModeResolutionResult {
  if (requested) {
    return {
      requested,
      effective: requested,
      source: "explicit-request",
      rationale: `User explicitly selected ${requested}.`,
    };
  }

  return {
    effective: DEFAULT_PROTOTYPING_MODE,
    source: "system-default",
    rationale: `No explicit mode was provided, so ${DEFAULT_PROTOTYPING_MODE} is used by default.`,
  };
}

export function derivePrototypingObligations(input: {
  surface: PrototypingSurface;
  effectiveMode: PrototypingMode;
}): PrototypingObligations {
  const isFullHarness = input.effectiveMode === "full-harness";
  return {
    requireRuntimeGate: isFullHarness,
    requireUiFidelity: isFullHarness,
    requireRenderBundle: isFullHarness,
    requireBrowserQaBundle: isFullHarness,
    requireIterations: true,
    maxIterations: PROTOTYPING_MAX_ITERATIONS[input.effectiveMode],
    validCombination: true,
  };
}
