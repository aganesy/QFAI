/**
 * CapabilityProfiler — assesses project capability profiles.
 *
 * Deterministic: same input always produces same output.
 */

import type { CapabilityProfile, ProjectCharacteristics } from "./types.js";

export class CapabilityProfiler {
  /**
   * Assesses a project's capability profile from its characteristics.
   *
   * - testMaturity derived from testRatio (clamped 0..1)
   * - specCoverage passed through (clamped 0..1)
   * - codeComplexity: raw complexity value (clamped 0..1); higher = more complex
   * - observabilityReadiness: weighted average of all factors
   */
  assess(characteristics: ProjectCharacteristics): CapabilityProfile {
    const testMaturity = clamp(characteristics.testRatio);
    const specCoverage = clamp(characteristics.specCoverage);
    const codeComplexity = clamp(characteristics.codeComplexity);

    // For readiness calculation, invert complexity: high complexity → low contribution
    const observabilityReadiness =
      Math.round((testMaturity * 0.3 + specCoverage * 0.3 + (1 - codeComplexity) * 0.4) * 1000) /
      1000;

    return {
      testMaturity,
      specCoverage,
      codeComplexity,
      observabilityReadiness,
    };
  }
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}
