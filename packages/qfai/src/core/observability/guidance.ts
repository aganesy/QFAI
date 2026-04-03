/**
 * ModeGuidance — recommends standard or full-harness mode based on project characteristics.
 * SPEC-0032
 *
 * Advisory only — does not change mode.
 */

import type { ModeRecommendation, ProjectCharacteristics } from "./types.js";

export class ModeGuidance {
  /**
   * Recommends a mode based on project characteristics.
   *
   * Standard: fileCount <= 1000 AND testRatio >= 0.3 AND specCoverage >= 0.5 AND codeComplexity <= 0.7
   * Full-harness: otherwise
   */
  recommend(characteristics: ProjectCharacteristics): ModeRecommendation {
    const { fileCount, testRatio, specCoverage, codeComplexity } = characteristics;

    if (fileCount <= 1000 && testRatio >= 0.3 && specCoverage >= 0.5 && codeComplexity <= 0.7) {
      return {
        mode: "standard",
        reasoning: `Project size, test ratio, spec coverage, and code complexity (${codeComplexity}) are within standard thresholds.`,
      };
    }

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
      reasoning: `Full-harness recommended: ${reasons.join("; ")}.`,
    };
  }
}
