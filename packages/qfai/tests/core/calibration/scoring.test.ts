// QFAI:SPEC-0030:TC-0030-0003
// QFAI:SPEC-0030:TC-0030-0004
// QFAI:SPEC-0030:TC-0030-0005
// QFAI:SPEC-0030:TC-0030-0006
// QFAI:SPEC-0030:TC-0030-0014
import { describe, expect, it } from "vitest";

import { ScoringEngine } from "../../../src/core/calibration/scoring.js";

describe("ScoringEngine", () => {
  describe("threshold configuration (TC-0030-0003)", () => {
    it("accepts custom thresholds overriding defaults", () => {
      const engine = new ScoringEngine({ accept: 0.85, refine: 0.6 });
      const thresholds = engine.getThresholds();
      expect(thresholds.accept).toBe(0.85);
      expect(thresholds.refine).toBe(0.6);
    });

    it("uses defaults when no thresholds provided", () => {
      const engine = new ScoringEngine();
      const thresholds = engine.getThresholds();
      expect(thresholds.accept).toBe(0.8);
      expect(thresholds.refine).toBe(0.5);
    });
  });

  describe("accept decision (TC-0030-0004)", () => {
    it("returns accept when score >= accept threshold", () => {
      const engine = new ScoringEngine({ accept: 0.8, refine: 0.5 });
      const result = engine.evaluate(0.85);
      expect(result.decision).toBe("accept");
      expect(result.score).toBe(0.85);
    });

    it("returns accept when score exactly equals threshold", () => {
      const engine = new ScoringEngine({ accept: 0.8, refine: 0.5 });
      const result = engine.evaluate(0.8);
      expect(result.decision).toBe("accept");
    });
  });

  describe("refine decision (TC-0030-0005)", () => {
    it("returns refine when score >= refine and < accept", () => {
      const engine = new ScoringEngine({ accept: 0.8, refine: 0.5 });
      const result = engine.evaluate(0.65);
      expect(result.decision).toBe("refine");
      expect(result.score).toBe(0.65);
    });
  });

  describe("pivot decision (TC-0030-0006)", () => {
    it("returns pivot when score < refine threshold", () => {
      const engine = new ScoringEngine({ accept: 0.8, refine: 0.5 });
      const result = engine.evaluate(0.35);
      expect(result.decision).toBe("pivot");
      expect(result.score).toBe(0.35);
    });
  });

  describe("threshold range validation (TC-0030-0014)", () => {
    it("throws when accept threshold exceeds 1.0", () => {
      const engine = new ScoringEngine();
      expect(() => engine.setThresholds({ accept: 1.5, refine: 0.5 })).toThrow("out of range");
    });

    it("throws when refine threshold is negative", () => {
      const engine = new ScoringEngine();
      expect(() => engine.setThresholds({ accept: 0.8, refine: -0.1 })).toThrow("out of range");
    });
  });
});
