/**
 * ModeGuidance — advisory for when runtime-proof-heavy prototyping is recommended.
 * SPEC-0032
 *
 * Advisory only — does not change mode.
 */

import type { ModeRecommendation, ProjectCharacteristics } from "./types.js";

export class ModeGuidance {
  /**
   * The current guidance still recommends full-harness when stronger runtime proof
   * is desirable. Project characteristics are retained only to explain that
   * recommendation; they do not mutate the selected mode.
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
          ? `packages/qfai prototyping recommends full-harness when stronger runtime proof is needed: ${reasons.join("; ")}.`
          : "packages/qfai prototyping currently recommends full-harness as the strongest runtime-proof mode, even when project characteristics are favorable.",
    };
  }
}
