// QFAI:SPEC-0017:TC-0017 (mode guidance v2.0)
// v2.0 (spec-0017 P14): mode tier removed; the recommendation always
// returns "single-thread-loop" but reasoning still surfaces project
// characteristic hints.
import { describe, expect, it } from "vitest";

import { ModeGuidance } from "../../../src/core/observability/guidance.js";

describe("ModeGuidance (v2.0)", () => {
  const guidance = new ModeGuidance();

  it("recommends single-thread-loop for favorable characteristics", () => {
    const result = guidance.recommend({
      fileCount: 500,
      testRatio: 0.5,
      specCoverage: 0.7,
      codeComplexity: 0.3,
    });

    expect(result.mode).toBe("single-thread-loop");
    expect(result.reasoning).toContain("single-thread evolution loop");
  });

  it("surfaces project characteristic reasons in reasoning", () => {
    const result = guidance.recommend({
      fileCount: 2000,
      testRatio: 0.1,
      specCoverage: 0.2,
      codeComplexity: 0.9,
    });

    expect(result.mode).toBe("single-thread-loop");
    expect(result.reasoning).toContain("fileCount 2000");
    expect(result.reasoning).toContain("testRatio 0.1");
  });

  it("recommendation is advisory only — calling twice with same input gives same result", () => {
    const a = guidance.recommend({
      fileCount: 100,
      testRatio: 0.8,
      specCoverage: 0.9,
      codeComplexity: 0.1,
    });
    const b = guidance.recommend({
      fileCount: 100,
      testRatio: 0.8,
      specCoverage: 0.9,
      codeComplexity: 0.1,
    });
    expect(b).toEqual(a);
  });
});
