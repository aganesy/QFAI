// QFAI:SPEC-0012:TC-0012-0007
// QFAI:SPEC-0012:TC-0012-0008
import { describe, expect, it } from "vitest";

import { DisagreementHandler } from "../../../src/core/calibration/disagreement.js";

describe("DisagreementHandler", () => {
  describe("majority rule (TC-0012-0007)", () => {
    it("resolves to majority classification with 3 reviewers", () => {
      const handler = new DisagreementHandler({ accept: 0.8, refine: 0.5 });
      const result = handler.resolve([
        { score: 0.9 }, // accept
        { score: 0.4 }, // reject
        { score: 0.85 }, // accept
      ]);

      // 2 accept vs 1 reject → majority = accept
      expect(result.decision).toBe("accept");
    });
  });

  describe("tie-breaking (TC-0012-0008)", () => {
    it("breaks tie using highest confidence reviewer", () => {
      const handler = new DisagreementHandler({ accept: 0.8, refine: 0.5 });
      const result = handler.resolve([
        { score: 0.9, confidence: 0.9 }, // accept
        { score: 0.4, confidence: 0.4 }, // reject
      ]);

      // Tie: 1 accept vs 1 reject; highest confidence = 0.9 (accept)
      expect(result.decision).toBe("accept");
    });

    it("handles tie with explicit confidence values", () => {
      const handler = new DisagreementHandler({ accept: 0.8, refine: 0.5 });
      const result = handler.resolve([
        { score: 0.3, confidence: 0.95 }, // reject, high confidence
        { score: 0.85, confidence: 0.6 }, // accept, lower confidence
      ]);

      // Tie: reject(conf=0.95) vs accept(conf=0.6) → reject wins by confidence
      expect(result.decision).toBe("reject");
    });
  });
});
