/**
 * Mode resolution logger for prototyping.
 *
 * Formats mode resolution results into structured log entries containing:
 * mode_source, recommended_mode, effective_mode, rationale, evidence_expectations.
 *
 * Phase M3 of v1.7.7 Mode Switch UX (spec-0006).
 */
import type { ModeResolution, ModeSource } from "./precedenceResolver.js";

export type ModeLogEntry = {
  mode_source: ModeSource;
  recommended_mode: string | null;
  effective_mode: string;
  rationale: string;
  evidence_expectations: string;
};

export const VALID_MODE_SOURCES: ReadonlySet<ModeSource> = new Set([
  "cli-override",
  "discussion-recommendation",
  "default",
]);

const EVIDENCE_EXPECTATIONS: Record<string, string> = {
  "low-cost": "L1/L2",
  "standard": "L2/L3",
  "full-harness": "L3/L4/L5",
};

/**
 * Format a mode resolution into a structured log entry.
 *
 * @param resolution - The mode resolution result from precedenceResolver
 * @returns Structured log entry with evidence expectations mapped by effective mode
 */
export function formatModeLog(resolution: ModeResolution): ModeLogEntry {
  return {
    mode_source: resolution.mode_source,
    recommended_mode: resolution.recommended_mode,
    effective_mode: resolution.effective_mode,
    rationale: resolution.rationale,
    evidence_expectations: EVIDENCE_EXPECTATIONS[resolution.effective_mode] ?? "L2/L3",
  };
}
