/**
 * Precedence resolver for prototyping mode.
 *
 * Resolves effective mode from three sources in strict order:
 * 1. CLI `--mode` flag (cli-override)
 * 2. Discussion artifact `recommended_mode` (discussion-recommendation)
 * 3. System default `standard` (default) — per DR-0084
 *
 * Phase M2 of v1.7.7 Mode Switch UX (spec-0006).
 */
import type { DiscussionRecommendation } from "./discussionReader.js";
import type { PrototypingMode } from "./modeResolver.js";

export type ModeSource = "cli-override" | "discussion-recommendation" | "default";

export type ModeResolution = {
  effective_mode: PrototypingMode;
  mode_source: ModeSource;
  recommended_mode: PrototypingMode | null;
  rationale: string;
};

const VALID_MODES: ReadonlySet<string> = new Set<PrototypingMode>([
  "default",
  "standard",
  "low-cost",
  "full-harness",
]);

function isPrototypingMode(value: string): value is PrototypingMode {
  return VALID_MODES.has(value);
}

const SYSTEM_DEFAULT_MODE: PrototypingMode = "standard";

export type PrecedenceInput = {
  cliMode: PrototypingMode | null;
  discussion: DiscussionRecommendation | null;
};

/**
 * Resolve the effective prototyping mode from available sources.
 *
 * @param input.cliMode - Mode from CLI `--mode` flag, or null if not provided
 * @param input.discussion - Discussion recommendation, or null if unavailable
 * @returns Mode resolution result with source attribution
 */
export function resolvePrecedence(input: PrecedenceInput): ModeResolution {
  const { cliMode, discussion } = input;
  const rawRecommended = discussion?.recommended_mode ?? null;
  const recommended_mode: PrototypingMode | null =
    rawRecommended && isPrototypingMode(rawRecommended) ? rawRecommended : null;

  // Level 1: CLI override
  if (cliMode) {
    return {
      effective_mode: cliMode,
      mode_source: "cli-override",
      recommended_mode,
      rationale: "CLI override",
    };
  }

  // Level 2: Discussion recommendation
  if (recommended_mode) {
    return {
      effective_mode: recommended_mode,
      mode_source: "discussion-recommendation",
      recommended_mode,
      rationale: discussion?.rationale ?? "discussion recommendation",
    };
  }

  // Level 3: System default
  return {
    effective_mode: SYSTEM_DEFAULT_MODE,
    mode_source: "default",
    recommended_mode: null,
    rationale: "system default",
  };
}
