// QFAI:SPEC-0032:TC-0032-0008
// QFAI:SPEC-0032:TC-0032-0009
// QFAI:SPEC-0032:TC-0032-0010
import { describe, expect, it } from "vitest";

import { ModeGuidance } from "../../../src/core/observability/guidance.js";

describe("ModeGuidance", () => {
  const guidance = new ModeGuidance();

  describe("standard recommendation (TC-0032-0008)", () => {
    it("recommends standard for high test ratio and coverage", () => {
      const result = guidance.recommend({
        fileCount: 500,
        testRatio: 0.5,
        specCoverage: 0.7,
        codeComplexity: 0.3,
      });

      expect(result.mode).toBe("standard");
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe("premium recommendation (TC-0032-0009)", () => {
    it("recommends premium for low test ratio and coverage", () => {
      const result = guidance.recommend({
        fileCount: 2000,
        testRatio: 0.1,
        specCoverage: 0.2,
        codeComplexity: 0.9,
      });

      expect(result.mode).toBe("premium");
      expect(result.reasoning).toBeTruthy();
    });
  });

  describe("advisory only (TC-0032-0010)", () => {
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
      expect(["standard", "premium"]).toContain(result.mode);
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
