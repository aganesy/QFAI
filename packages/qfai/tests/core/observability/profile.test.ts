// QFAI:SPEC-0032:TC-0032-0014
// QFAI:SPEC-0032:TC-0032-0015
// QFAI:SPEC-0032:TC-0032-0016
import { describe, expect, it } from "vitest";

import { CapabilityProfiler } from "../../../src/core/observability/profile.js";

describe("CapabilityProfiler", () => {
  const profiler = new CapabilityProfiler();

  describe("high coverage, low complexity (TC-0032-0014)", () => {
    it("produces high testMaturity and observabilityReadiness", () => {
      const profile = profiler.assess({
        fileCount: 200,
        testRatio: 0.9,
        specCoverage: 0.9,
        codeComplexity: 0.1,
      });

      expect(profile.testMaturity).toBeCloseTo(0.9, 1);
      expect(profile.specCoverage).toBeCloseTo(0.9, 1);
      expect(profile.codeComplexity).toBeCloseTo(0.1, 1); // raw complexity value
      expect(profile.observabilityReadiness).toBeGreaterThan(0.8);
    });
  });

  describe("low coverage, high complexity (TC-0032-0015)", () => {
    it("produces low testMaturity and observabilityReadiness", () => {
      const profile = profiler.assess({
        fileCount: 5000,
        testRatio: 0.2,
        specCoverage: 0.2,
        codeComplexity: 0.8,
      });

      expect(profile.testMaturity).toBeCloseTo(0.2, 1);
      expect(profile.specCoverage).toBeCloseTo(0.2, 1);
      expect(profile.codeComplexity).toBeCloseTo(0.8, 1); // raw complexity value
      expect(profile.observabilityReadiness).toBeLessThan(0.3);
    });
  });

  describe("determinism (TC-0032-0016)", () => {
    it("same input twice produces identical output", () => {
      const input = {
        fileCount: 800,
        testRatio: 0.55,
        specCoverage: 0.65,
        codeComplexity: 0.4,
      };

      const result1 = profiler.assess(input);
      const result2 = profiler.assess(input);

      expect(result1).toEqual(result2);
    });
  });
});
