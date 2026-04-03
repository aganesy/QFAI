import { readFile } from "node:fs/promises";

import { parse as parseYaml } from "yaml";

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

const VALID_MODES = new Set<PrototypingMode>(["low-cost", "standard", "full-harness"]);
const VALID_SURFACES = new Set<PrototypingSurface>([
  "web-ui",
  "mobile-ui",
  "desktop-ui",
  "mixed",
  "non-ui",
]);

// ---------------------------------------------------------------------------
// Discussion recommendation parsing (dual-schema: namespaced + legacy)
// ---------------------------------------------------------------------------

export type ParseDiscussionResult = {
  recommendation: DiscussionModeRecommendation | null;
  warnings: string[];
};

/**
 * Parse a prototyping.yaml file from a discussion pack.
 * Supports both canonical namespaced (`prototyping.*`) and legacy top-level schema.
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

  const namespacedBlock = isRecord(parsed.prototyping) ? parsed.prototyping : null;
  const hasNamespaced = namespacedBlock !== null && isValidPrototypingMode(namespacedBlock.recommended_mode);
  const hasTopLevel = isValidPrototypingMode(parsed.recommended_mode);

  if (hasNamespaced && hasTopLevel) {
    warnings.push(
      "QFAI-PROT-232: conflicting namespaced and top-level prototyping recommendation blocks — namespaced takes precedence",
    );
  }

  if (hasNamespaced) {
    const rec = extractRecommendation(namespacedBlock!, "canonical-namespaced");
    if (rec) {
      return { recommendation: rec, warnings };
    }
  }

  if (hasTopLevel) {
    warnings.push(
      "QFAI-PROT-231: deprecated top-level prototyping recommendation schema — migrate to prototyping.* namespaced form",
    );
    const rec = extractRecommendation(parsed, "legacy-top-level");
    if (rec) {
      return { recommendation: rec, warnings };
    }
  }

  return { recommendation: null, warnings };
}

function extractRecommendation(
  obj: Record<string, unknown>,
  sourceSchema: DiscussionRecommendationSourceSchema,
): DiscussionModeRecommendation | null {
  if (!isValidPrototypingMode(obj.recommended_mode)) {
    return null;
  }
  const rationale = asNonEmptyString(obj.rationale);
  if (!rationale) {
    return null;
  }

  const allowedModes = normalizeAllowedModes(
    Array.isArray(obj.allowed_modes)
      ? obj.allowed_modes.filter((value): value is string => typeof value === "string")
      : undefined,
  );
  const surface = isValidSurface(obj.surface) ? obj.surface : undefined;
  const updatedAt = asNonEmptyString(obj.updated_at);

  return {
    recommendedMode: obj.recommended_mode,
    rationale,
    ...(allowedModes.length > 0 ? { allowedModes } : {}),
    ...(surface ? { surface } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    sourceSchema,
  };
}

// ---------------------------------------------------------------------------
// Mode resolution (single-source precedence)
// ---------------------------------------------------------------------------

export function resolvePrototypingMode(input: ModeResolutionInput): ModeResolutionResult {
  const defaultMode = input.defaultMode ?? "standard";
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
    source: "default",
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
      `QFAI-PROT-243: requested mode ${input.explicitMode} is not in discussion allowed_modes [${input.discussionRecommendation.allowedModes.join(", ")}]`,
    );
  }

  if (input.discussionRecommendation?.sourceSchema === "legacy-top-level") {
    warnings.push(
      "QFAI-PROT-231: discussion recommendation uses deprecated top-level schema",
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
  return VALID_SURFACES.has(trimmed as PrototypingSurface)
    ? (trimmed as PrototypingSurface)
    : null;
}

export function inferSurfaceFromRecommendationAndEvidence(input: {
  recommendationSurface?: PrototypingSurface | undefined;
  evidenceSurface?: PrototypingSurface | undefined;
  hasUiFidelity?: boolean | undefined;
  hasRenderBundle?: boolean | undefined;
  hasBrowserQaBundle?: boolean | undefined;
  hasUiRoutes?: boolean | undefined;
  hasRuntimeGateUi?: boolean | undefined;
}): PrototypingSurface {
  if (input.evidenceSurface && isValidPrototypingSurface(input.evidenceSurface)) {
    return input.evidenceSurface;
  }
  if (input.recommendationSurface && isValidPrototypingSurface(input.recommendationSurface)) {
    return input.recommendationSurface;
  }

  const hasUiSignals =
    input.hasUiFidelity ||
    input.hasRenderBundle ||
    input.hasBrowserQaBundle ||
    input.hasUiRoutes ||
    input.hasRuntimeGateUi;

  return hasUiSignals ? "web-ui" : "non-ui";
}

// ---------------------------------------------------------------------------
// Obligation matrix (single source for validator + report)
// ---------------------------------------------------------------------------

export function derivePrototypingObligations(input: {
  surface: PrototypingSurface;
  effectiveMode: PrototypingMode;
}): PrototypingObligations {
  const uiBearing = isUiBearingSurface(input.surface);
  if (!uiBearing) {
    return {
      requireRuntimeGate: false,
      requireUiFidelity: false,
      requireRenderBundle: false,
      requireBrowserQaBundle: false,
      requireFullHarness: input.effectiveMode === "full-harness",
    };
  }

  if (input.effectiveMode === "full-harness") {
    return {
      requireRuntimeGate: true,
      requireUiFidelity: true,
      requireRenderBundle: true,
      requireBrowserQaBundle: true,
      requireFullHarness: true,
    };
  }

  if (input.effectiveMode === "standard") {
    return {
      requireRuntimeGate: false,
      requireUiFidelity: true,
      requireRenderBundle: false,
      requireBrowserQaBundle: false,
      requireFullHarness: false,
    };
  }

  return {
    requireRuntimeGate: false,
    requireUiFidelity: false,
    requireRenderBundle: false,
    requireBrowserQaBundle: false,
    requireFullHarness: false,
  };
}

// ---------------------------------------------------------------------------
// Type guards and utility
// ---------------------------------------------------------------------------

export function isValidPrototypingMode(value: unknown): value is PrototypingMode {
  return typeof value === "string" && VALID_MODES.has(value as PrototypingMode);
}

export function isValidPrototypingSurface(value: unknown): value is PrototypingSurface {
  return typeof value === "string" && VALID_SURFACES.has(value as PrototypingSurface);
}

export function isUiBearingSurface(
  surface: PrototypingSurface,
): surface is Exclude<PrototypingSurface, "non-ui"> {
  return surface !== "non-ui";
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
