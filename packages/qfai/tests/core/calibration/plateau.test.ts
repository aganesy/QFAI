// QFAI:SPEC-0030:TC-0030-0009
// QFAI:SPEC-0030:TC-0030-0010
// QFAI:SPEC-0030:TC-0030-0011
import { describe, expect, it } from "vitest";

import { PlateauDetector } from "../../../src/core/calibration/plateau.js";

describe("PlateauDetector", () => {
  describe("plateau detection (TC-0030-0009)", () => {
    it("detects plateau when delta < threshold over lookback window", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 });
      const result = detector.detect([0.71, 0.72, 0.72]);

      expect(result.detected).toBe(true);
      expect(result.delta).toBeCloseTo(0.01, 5);
    });

    it("does not detect plateau when delta >= threshold", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 });
      const result = detector.detect([0.6, 0.7, 0.75]);

      expect(result.detected).toBe(false);
    });

    it("does not detect plateau with insufficient history", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 });
      const result = detector.detect([0.72, 0.72]);

      expect(result.detected).toBe(false);
    });
  });

  describe("plateau exit behavior (TC-0030-0010)", () => {
    it("exits loop with plateau status and best score", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 });
      const scores = [0.6, 0.65, 0.7, 0.71, 0.72, 0.72, 0.72, 0.72];

      const result = detector.shouldExit(8, scores);
      expect(result.exit).toBe(true);
      expect(result.reason).toBe("plateau");
      expect(result.bestScore).toBe(0.72);
    });
  });

  describe("max iteration cap (TC-0030-0011)", () => {
    it("hard-exits at 15 iterations with best score", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 }, 15);
      const scores = [
        0.4, 0.45, 0.5, 0.55, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.75, 0.72, 0.73, 0.74, 0.74,
      ];

      const result = detector.shouldExit(15, scores);
      expect(result.exit).toBe(true);
      expect(result.reason).toBe("max-iterations-reached");
      expect(result.bestScore).toBe(0.75);
    });

    it("does not exit before reaching max iterations", () => {
      const detector = new PlateauDetector({ deltaThreshold: 0.02, lookbackWindow: 3 }, 15);
      const scores = [0.4, 0.5, 0.6];

      const result = detector.shouldExit(3, scores);
      expect(result.exit).toBe(false);
      expect(result.reason).toBeNull();
    });
  });
});
