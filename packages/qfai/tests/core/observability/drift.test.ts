// QFAI:SPEC-0012:TC-0012-0011
// QFAI:SPEC-0012:TC-0012-0012
// QFAI:SPEC-0012:TC-0012-0013
import { describe, expect, it } from "vitest";

import { DriftTracker } from "../../../src/core/observability/drift.js";

describe("DriftTracker", () => {
  const tracker = new DriftTracker();

  describe("drift detection (TC-0012-0011)", () => {
    it("2 runs with different distributions yield driftScore > 0", () => {
      const result = tracker.analyze([
        { quality: 0.8, coverage: 0.9 },
        { quality: 0.6, coverage: 0.7 },
      ]);

      expect(result.driftScore).toBeGreaterThan(0);
    });
  });

  describe("threshold flagging (TC-0012-0012)", () => {
    it("threshold 0.10, drift 0.12 → dimension flagged", () => {
      const result = tracker.analyze([{ accuracy: 0.8 }, { accuracy: 0.92 }], 0.1);

      expect(result.flaggedDimensions).toContain("accuracy");
      expect(result.withinThreshold).toBe(false);
    });
  });

  describe("threshold not exceeded (TC-0012-0013)", () => {
    it("threshold 0.20, drift 0.12 → not flagged", () => {
      const result = tracker.analyze([{ accuracy: 0.8 }, { accuracy: 0.92 }], 0.2);

      expect(result.flaggedDimensions).not.toContain("accuracy");
      expect(result.withinThreshold).toBe(true);
    });
  });
});
