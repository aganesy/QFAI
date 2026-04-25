import {
  CANONICAL_PROTOTYPING_SURFACES,
  isCanonicalPrototypingSurface,
  type CanonicalPrototypingSurface,
} from "../domain/surface.js";

export const PROTOTYPING_MODES = ["low-cost", "standard", "full-harness"] as const;
export const DEFAULT_PROTOTYPING_MODE = "standard" as const;

/**
 * Maximum cycles permitted per prototyping mode.
 *
 * Per spec-0017 REQ-0001 (mode invariant), modes differ only in maxCycles.
 * All other obligations (review cycle, evidence, reviewer gate, completion
 * criteria) are identical across modes.
 */
export const PROTOTYPING_MAX_CYCLES = {
  "low-cost": 1,
  standard: 3,
  "full-harness": 20,
} as const;

/**
 * Alias retained for callers still using spec-0012 wording.
 * Will be removed in a later phase once all callers reference PROTOTYPING_MAX_CYCLES.
 */
export const PROTOTYPING_MAX_ITERATIONS = PROTOTYPING_MAX_CYCLES;

export const PROTOTYPING_SUPPORTED_SURFACES = ["web", "mobile", "desktop", "mixed"] as const;

export type PrototypingMode = (typeof PROTOTYPING_MODES)[number];
export type ModeSelectionSource = "explicit-request" | "system-default";
export type PrototypingSurface = CanonicalPrototypingSurface;

export type PrototypingBrowserTool = "playwright-cli";

export type ModeResolutionResult = {
  requested?: PrototypingMode;
  effective: PrototypingMode;
  source: ModeSelectionSource;
  rationale: string;
};

/**
 * Prototyping obligations (spec-0017 REQ-0001, REQ-0002, REQ-0004).
 *
 * Every obligation flag is true for every mode. The only mode-dependent
 * value is {@link maxCycles}. Validators enforcing per-mode differentiation
 * for any other field violate the mode invariant (QFAI-PROT-MODE-001).
 */
export type PrototypingObligations = {
  /** Browser tool handed to the AI evaluator sub-agent. */
  browserTool: PrototypingBrowserTool;

  // New obligations declared by spec-0017 (consumed starting Phase 5).
  requireExecutionPlan: boolean;
  requirePlaywrightEvidence: boolean;
  requireReviewBundle: boolean;
  requireEvaluatorReview: boolean;
  requireBestOfHistory: boolean;
  requireBreakthrough: boolean;
  requireIndependentReviewerGate: boolean;
  requirePerfect100Completion: boolean;

  // Legacy obligations retained for back-compat with spec-0012 callers.
  // These now evaluate to true for every mode (no longer full-harness-only).
  requireRuntimeGate: boolean;
  requireUiFidelity: boolean;
  requireRenderBundle: boolean;
  requireBrowserQaBundle: boolean;
  requireIterations: boolean;

  /** Cycle budget; the only mode-dependent value (spec-0017 REQ-0001). */
  maxCycles: number;

  /**
   * Alias for {@link maxCycles} kept for callers still using the spec-0012
   * "iterations" vocabulary. Same numeric value.
   */
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

/**
 * Derive prototyping obligations for a (surface, mode) pair.
 *
 * Per spec-0017 REQ-0001 the return value is identical across modes except
 * for {@link PrototypingObligations.maxCycles}. Callers MUST NOT branch
 * on mode when deciding which obligation to enforce.
 */
export function derivePrototypingObligations(input: {
  surface: PrototypingSurface;
  effectiveMode: PrototypingMode;
}): PrototypingObligations {
  const maxCycles = PROTOTYPING_MAX_CYCLES[input.effectiveMode];
  return {
    browserTool: "playwright-cli",
    requireExecutionPlan: true,
    requirePlaywrightEvidence: true,
    requireReviewBundle: true,
    requireEvaluatorReview: true,
    requireBestOfHistory: true,
    requireBreakthrough: true,
    requireIndependentReviewerGate: true,
    requirePerfect100Completion: true,

    requireRuntimeGate: true,
    requireUiFidelity: true,
    requireRenderBundle: true,
    requireBrowserQaBundle: true,
    requireIterations: true,

    maxCycles,
    maxIterations: maxCycles,
    validCombination: true,
  };
}
