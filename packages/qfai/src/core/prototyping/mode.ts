import { readFile } from "node:fs/promises";

import { parse as parseYaml } from "yaml";

import type {
  DiscussionModeRecommendation,
  ModeResolutionInput,
  ModeResolutionResult,
  PrototypingMode,
  PrototypingSurface,
} from "./types.js";

const VALID_MODES = new Set<PrototypingMode>(["low-cost", "standard", "full-harness"]);
const VALID_SURFACES = new Set<PrototypingSurface>([
  "web-ui",
  "mobile-ui",
  "desktop-ui",
  "mixed",
  "non-ui",
]);

export async function parseDiscussionModeRecommendation(
  filePath: string,
): Promise<DiscussionModeRecommendation | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !isValidPrototypingMode(parsed.recommended_mode)) {
    return null;
  }
  const rationale = asNonEmptyString(parsed.rationale);
  if (!rationale) {
    return null;
  }

  const allowedModes = normalizeAllowedModes(
    Array.isArray(parsed.allowed_modes)
      ? parsed.allowed_modes.filter((value): value is string => typeof value === "string")
      : undefined,
  );
  const surface = isValidSurface(parsed.surface) ? parsed.surface : undefined;
  const updatedAt = asNonEmptyString(parsed.updated_at);

  return {
    recommendedMode: parsed.recommended_mode,
    rationale,
    ...(allowedModes.length > 0 ? { allowedModes } : {}),
    ...(surface ? { surface } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

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

export function isValidPrototypingMode(value: unknown): value is PrototypingMode {
  return typeof value === "string" && VALID_MODES.has(value as PrototypingMode);
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
  return typeof value === "string" && VALID_SURFACES.has(value as PrototypingSurface);
}
