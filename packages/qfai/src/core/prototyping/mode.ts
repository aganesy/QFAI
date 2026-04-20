import { readFile } from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import {
  CANONICAL_PROTOTYPING_SURFACES,
  isCanonicalPrototypingSurface,
} from "../domain/surface.js";
import {
  hasLegacyRecommendationKeys,
  hasNamespacedRecommendationBlock,
  isPlainRecord,
} from "./recommendationSchema.js";
import { validateRecommendationSemantics } from "./recommendationSemantics.js";
import type {
  DiscussionModeRecommendation,
  DiscussionRecommendationSourceSchema,
  ModeResolutionInput,
  ModeResolutionResult,
  PrototypingMode,
  PrototypingObligations,
  PrototypingSurface,
  ResolveModeInput,
  ResolvedModeSummary,
} from "./types.js";
import { isSupportedPrototypingSurface } from "./surfacePolicy.js";

const VALID_MODES = new Set<PrototypingMode>(["full-harness"]);
const VALID_SURFACES = new Set<PrototypingSurface>(CANONICAL_PROTOTYPING_SURFACES);
export const FULL_HARNESS_INVALID_COMBINATION_MESSAGE =
  "packages/qfai v1.7.15 では prototyping は full-harness / UI-only です。";
export const UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE = "unsupported_prototyping_mode";
export const UNSUPPORTED_PROTOTYPING_MODE_MESSAGE =
  "packages/qfai v1.7.15 では prototyping は full-harness のみサポートします。";
export const NON_UI_PROTOTYPING_SURFACE_REASON_CODE = "unsupported_non_ui_prototyping_surface";
export const NON_UI_PROTOTYPING_SURFACE_MESSAGE =
  "packages/qfai v1.7.15 では prototyping は UI-bearing surface のみサポートします。";

// ---------------------------------------------------------------------------
// Discussion recommendation parsing (canonical namespaced only)
// ---------------------------------------------------------------------------

export type ParseDiscussionResult = {
  recommendation: DiscussionModeRecommendation | null;
  warnings: string[];
};

/**
 * Parse a prototyping.yaml file from a discussion pack.
 * Supports only the canonical namespaced (`prototyping.*`) schema.
 */
export async function parseDiscussionModeRecommendation(
  filePath: string,
): Promise<DiscussionModeRecommendation | null> {
  const result = await parseDiscussionModeRecommendationWithWarnings(filePath);
  return result.recommendation;
}

export async function parseDiscussionModeRecommendationWithWarnings(
  filePath: string,
): Promise<ParseDiscussionResult> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return { recommendation: null, warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch {
    return { recommendation: null, warnings: [] };
  }

  if (!isRecord(parsed)) {
    return { recommendation: null, warnings: [] };
  }

  return parseDiscussionFromObject(parsed);
}

export function parseDiscussionFromObject(parsed: Record<string, unknown>): ParseDiscussionResult {
  const warnings: string[] = [];
  const hasStaleTopLevelKeys = hasLegacyRecommendationKeys(parsed);

  if (hasStaleTopLevelKeys) {
    warnings.push(
      "prototyping.yaml must use the canonical namespaced schema under 'prototyping:' only. Legacy top-level recommendation keys are not supported.",
    );
    // Stale top-level keys coexist is hard invalid regardless of namespaced block validity
    return { recommendation: null, warnings };
  }

  const hasNamespaced = hasNamespacedRecommendationBlock(parsed);

  if (hasNamespaced) {
    if (!isPlainRecord(parsed.prototyping)) {
      return { recommendation: null, warnings };
    }
    const result = extractRecommendation(parsed.prototyping, "canonical-namespaced");
    warnings.push(...result.warnings);
    return { recommendation: result.recommendation, warnings };
  }

  return { recommendation: null, warnings };
}

type ExtractRecommendationResult = {
  recommendation: DiscussionModeRecommendation | null;
  warnings: string[];
};

function extractRecommendation(
  obj: Record<string, unknown>,
  _sourceSchema: DiscussionRecommendationSourceSchema,
): ExtractRecommendationResult {
  if (!isValidPrototypingMode(obj.recommended_mode)) {
    return { recommendation: null, warnings: [] };
  }
  const rationale = asNonEmptyString(obj.rationale);
  if (!rationale) {
    return { recommendation: null, warnings: [] };
  }

  if (!Array.isArray(obj.allowed_modes)) {
    return { recommendation: null, warnings: [] };
  }
  const allowedModes = normalizeAllowedModes(
    obj.allowed_modes.filter((value): value is string => typeof value === "string"),
  );
  if (allowedModes.length === 0) {
    return { recommendation: null, warnings: [] };
  }

  if (!isValidSurface(obj.surface)) {
    return { recommendation: null, warnings: [] };
  }
  const surface = obj.surface;
  const updatedAt = asNonEmptyString(obj.updated_at);

  const semanticResult = validateRecommendationSemantics({
    recommendedMode: obj.recommended_mode,
    allowedModes,
  });
  if (!semanticResult.valid) {
    return {
      recommendation: null,
      warnings: [`${semanticResult.code}: ${semanticResult.message}`],
    };
  }

  return {
    recommendation: {
      recommendedMode: obj.recommended_mode,
      rationale,
      allowedModes,
      surface,
      ...(updatedAt ? { updatedAt } : {}),
      sourceSchema: "canonical-namespaced",
    },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Mode resolution (single-source precedence)
// ---------------------------------------------------------------------------

export function resolvePrototypingMode(input: ModeResolutionInput): ModeResolutionResult {
  const defaultMode = "full-harness";
  if (input.explicitMode) {
    return {
      requested: input.explicitMode,
      effective: input.explicitMode,
      source: "explicit-request",
      rationale: `User explicitly selected ${input.explicitMode}.`,
    };
  }

  if (input.discussionRecommendation) {
    return {
      effective: input.discussionRecommendation.recommendedMode,
      source: "discussion-recommendation",
      rationale: input.discussionRecommendation.rationale,
    };
  }

  return {
    effective: defaultMode,
    source: "system-default",
    rationale: `No explicit request or discussion recommendation was provided, so ${defaultMode} is used by default.`,
  };
}

/**
 * Full resolved mode summary with discussion recommendation context and warnings.
 */
export function summarizeResolvedMode(input: ModeResolutionInput): ResolvedModeSummary {
  const resolved = resolvePrototypingMode(input);
  const warnings: string[] = [];

  if (
    input.discussionRecommendation?.allowedModes &&
    input.explicitMode &&
    !input.discussionRecommendation.allowedModes.includes(input.explicitMode)
  ) {
    warnings.push(
      `QFAI-PROT-236: requested mode ${input.explicitMode} is not in discussion allowed_modes [${input.discussionRecommendation.allowedModes.join(", ")}]`,
    );
  }

  return {
    ...resolved,
    ...(input.discussionRecommendation
      ? { discussionRecommendation: input.discussionRecommendation }
      : {}),
    ...(input.discussionRecommendation?.surface
      ? { surface: input.discussionRecommendation.surface }
      : {}),
    warnings,
  };
}

/**
 * Resolve mode from raw input (ResolveModeInput) — includes discussion artifact parsing.
 */
export function resolvePrototypingModeFromInput(input: ResolveModeInput): ResolvedModeSummary {
  let recommendation: DiscussionModeRecommendation | null = null;
  const warnings: string[] = [];

  if (input.discussionArtifact !== undefined && isRecord(input.discussionArtifact)) {
    const result = parseDiscussionFromObject(input.discussionArtifact);
    recommendation = result.recommendation;
    warnings.push(...result.warnings);
  }

  const modeInput: ModeResolutionInput = {
    explicitMode: input.requested,
    discussionRecommendation: recommendation,
    defaultMode: input.defaultMode,
  };

  const summary = summarizeResolvedMode(modeInput);
  summary.warnings.push(...warnings);
  return summary;
}

// ---------------------------------------------------------------------------
// Surface normalization and inference
// ---------------------------------------------------------------------------

export function normalizeSurface(input: unknown): PrototypingSurface | null {
  if (typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim().toLowerCase();
  return VALID_SURFACES.has(trimmed as PrototypingSurface) ? (trimmed as PrototypingSurface) : null;
}

export function inferSurfaceFromRecommendationAndEvidence(input: {
  recommendationSurface?: PrototypingSurface | undefined;
  evidenceSurface?: PrototypingSurface | undefined;
  hasUiFidelity?: boolean | undefined;
  hasRenderBundle?: boolean | undefined;
  hasBrowserQaBundle?: boolean | undefined;
  hasUiRoutes?: boolean | undefined;
  hasRuntimeGateUi?: boolean | undefined;
}): PrototypingSurface | null {
  if (input.evidenceSurface && isValidPrototypingSurface(input.evidenceSurface)) {
    return input.evidenceSurface;
  }
  if (input.recommendationSurface && isValidPrototypingSurface(input.recommendationSurface)) {
    return input.recommendationSurface;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Obligation matrix (single source for validator + report)
// ---------------------------------------------------------------------------

export function derivePrototypingObligations(input: {
  surface: PrototypingSurface;
  effectiveMode: string;
}): PrototypingObligations {
  if (!isSupportedPrototypingSurface(input.surface)) {
    return {
      requireRuntimeGate: false,
      requireUiFidelity: false,
      requireRenderBundle: false,
      requireBrowserQaBundle: false,
      requireFullHarness: false,
      validCombination: false,
      invalidReasonCode: NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
      invalidReason: NON_UI_PROTOTYPING_SURFACE_MESSAGE,
    };
  }

  if (input.effectiveMode !== "full-harness") {
    return {
      requireRuntimeGate: false,
      requireUiFidelity: false,
      requireRenderBundle: false,
      requireBrowserQaBundle: false,
      requireFullHarness: false,
      validCombination: false,
      invalidReasonCode: UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE,
      invalidReason: UNSUPPORTED_PROTOTYPING_MODE_MESSAGE,
    };
  }

  return {
    requireRuntimeGate: true,
    requireUiFidelity: true,
    requireRenderBundle: true,
    requireBrowserQaBundle: true,
    requireFullHarness: true,
    validCombination: true,
  };
}

// ---------------------------------------------------------------------------
// Type guards and utility
// ---------------------------------------------------------------------------

export function isValidPrototypingMode(value: unknown): value is PrototypingMode {
  return typeof value === "string" && VALID_MODES.has(value as PrototypingMode);
}

export function isValidPrototypingSurface(value: unknown): value is PrototypingSurface {
  return typeof value === "string" && isCanonicalPrototypingSurface(value);
}

export function requiresVisualBrowserEvidence(surface: PrototypingSurface): boolean {
  return isSupportedPrototypingSurface(surface);
}

export function normalizeAllowedModes(modes?: string[]): PrototypingMode[] {
  if (!modes) {
    return [];
  }
  const normalized = modes.filter(isValidPrototypingMode);
  return Array.from(new Set(normalized)).sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isValidSurface(value: unknown): value is PrototypingSurface {
  return isValidPrototypingSurface(value);
}
