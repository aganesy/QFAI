/**
 * Calibration overrides — applies project-level overrides from
 * prototyping.calibration.overrides to the base calibration pack,
 * producing an effective configuration.
 *
 * When overrides are absent, system defaults are preserved with no error.
 *
 * spec-0012 TC-0012-0304 / TC-0012-0305 / AC-0012-0185, AC-0012-0186
 */

import type { CalibrationOverrides, CalibrationPack, EffectiveCalibrationConfig } from "./types.js";
import { DEFAULT_EFFECTIVE_CONFIG } from "./types.js";

export function applyCalibrationOverrides(
  pack: CalibrationPack,
  overrides?: CalibrationOverrides,
): EffectiveCalibrationConfig {
  const baseMaxIterations = pack.maxIterations;
  const merged = overrides ?? pack.overrides;

  if (!merged) {
    return {
      maxIterations: baseMaxIterations,
      perAxisMinimum: DEFAULT_EFFECTIVE_CONFIG.perAxisMinimum,
      maxIterationsByMode: {},
    };
  }

  const perAxisMinimum =
    typeof merged.perAxisMinimum === "number"
      ? merged.perAxisMinimum
      : DEFAULT_EFFECTIVE_CONFIG.perAxisMinimum;

  const maxIterationsByMode =
    merged.maxIterationsByMode !== undefined ? { ...merged.maxIterationsByMode } : {};

  return {
    maxIterations: baseMaxIterations,
    perAxisMinimum,
    maxIterationsByMode,
  };
}
