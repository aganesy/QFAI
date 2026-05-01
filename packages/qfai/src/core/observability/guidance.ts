/**
 * ModeGuidance — advisory for prototyping runtime-proof recommendations.
 *
 * v2.0 (spec-0017 P14): the v1.x mode tier is removed. The guidance now
 * always recommends the v2.0 single-thread evolution loop (the only mode)
 * but retains the project-characteristic explanation so callers can
 * explain *why* the loop is appropriate for the project shape.
 */

import type { ModeRecommendation, ProjectCharacteristics } from "./types.js";

export class ModeGuidance {
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
      mode: "single-thread-loop",
      reasoning:
        reasons.length > 0
          ? `packages/qfai prototyping runs the single-thread evolution loop; project characteristics: ${reasons.join("; ")}.`
          : "packages/qfai prototyping always runs the single-thread evolution loop (15 cycles, 4 ordinal axes).",
    };
  }
}
