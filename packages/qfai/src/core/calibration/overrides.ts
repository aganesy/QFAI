/**
 * Calibration overrides — applies project-level overrides from
 * prototyping.calibration.overrides to the base calibration pack,
 * producing an effective configuration.
 *
 * When overrides are absent, system defaults are preserved with no error.
 *
 * v2.0 (spec-0017 P14): the per-mode override map was removed alongside
 * the v1.x mode tier; iteration count is global (15) via
 * core/prototyping/iteration.ts#MAX_ITERATIONS.
 */

import type { CalibrationPack, EffectiveCalibrationConfig } from "./types.js";
import { DEFAULT_EFFECTIVE_CONFIG } from "./types.js";

type CalibrationOverrideShape = {
  perAxisMinimum?: number;
};

export function applyCalibrationOverrides(
  pack: CalibrationPack,
  overrides?: CalibrationOverrideShape,
): EffectiveCalibrationConfig {
  const baseMaxIterations = pack.maxIterations;

  if (!overrides) {
    return {
      maxIterations: baseMaxIterations,
      perAxisMinimum: DEFAULT_EFFECTIVE_CONFIG.perAxisMinimum,
    };
  }

  const perAxisMinimum =
    typeof overrides.perAxisMinimum === "number"
      ? overrides.perAxisMinimum
      : DEFAULT_EFFECTIVE_CONFIG.perAxisMinimum;

  return {
    maxIterations: baseMaxIterations,
    perAxisMinimum,
  };
}
