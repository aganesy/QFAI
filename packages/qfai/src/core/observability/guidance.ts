/**
 * ModeGuidance — full-harness-only advisory for prototyping.
 * SPEC-0032
 *
 * Advisory only — does not change mode.
 */

import type { ModeRecommendation, ProjectCharacteristics } from "./types.js";

export class ModeGuidance {
  /**
   * `packages/qfai` v1.7.15 prototyping is full-harness only.
   * Project characteristics are retained only to explain why runtime proof is required.
   */
  recommend(characteristics: ProjectCharacteristics): ModeRecommendation {
    const { fileCount, testRatio, specCoverage, codeComplexity } = characteristics;
    const reasons: string[] = [];

    if (fileCount > 1000) {
      reasons.push(`fileCount ${fileCount} exceeds 1000`);
    }
    if (testRatio < 0.3) {
      reasons.push(`testRatio ${testRatio} below 0.3`);
    }
    if (specCoverage < 0.5) {
      reasons.push(`specCoverage ${specCoverage} below 0.5`);
    }
    if (codeComplexity > 0.7) {
      reasons.push(`codeComplexity ${codeComplexity} exceeds 0.7`);
    }

    return {
      mode: "full-harness",
      reasoning:
        reasons.length > 0
          ? `packages/qfai v1.7.15 prototyping is full-harness only. Runtime proof is required: ${reasons.join("; ")}.`
          : "packages/qfai v1.7.15 prototyping is full-harness only. Runtime proof remains required even when project characteristics are favorable.",
    };
  }
}
