// QFAI:SPEC-0012:TC-0012-0008
// QFAI:SPEC-0012:TC-0012-0009
// QFAI:SPEC-0012:TC-0012-0010
import { describe, expect, it } from "vitest";

import { ModeGuidance } from "../../../src/core/observability/guidance.js";

describe("ModeGuidance", () => {
  const guidance = new ModeGuidance();

  describe("full-harness recommendation (TC-0012-0008)", () => {
    it("recommends full-harness even for favorable characteristics", () => {
      const result = guidance.recommend({
        fileCount: 500,
        testRatio: 0.5,
        specCoverage: 0.7,
        codeComplexity: 0.3,
      });

      expect(result.mode).toBe("full-harness");
      expect(result.reasoning).toContain("full-harness only");
    });
  });

  describe("full-harness recommendation (TC-0012-0009)", () => {
    it("recommends full-harness for low test ratio and coverage", () => {
      const result = guidance.recommend({
        fileCount: 2000,
        testRatio: 0.1,
        specCoverage: 0.2,
        codeComplexity: 0.9,
      });

      expect(result.mode).toBe("full-harness");
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe("advisory only (TC-0012-0010)", () => {
    it("recommendation does not change mode — returns advisory info only", () => {
      const result = guidance.recommend({
        fileCount: 100,
        testRatio: 0.8,
        specCoverage: 0.9,
        codeComplexity: 0.1,
      });

      // The result is purely a recommendation object — it has no side effects
      expect(result).toHaveProperty("mode");
      expect(result).toHaveProperty("reasoning");
      expect(result.mode).toBe("full-harness");
      // No mode mutation — calling again with same input gives same result
      const result2 = guidance.recommend({
        fileCount: 100,
        testRatio: 0.8,
        specCoverage: 0.9,
        codeComplexity: 0.1,
      });
      expect(result2).toEqual(result);
    });
  });
});
