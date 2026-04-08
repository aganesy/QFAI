// QFAI:SPEC-0012:TC-0012-0021
import { describe, expect, it } from "vitest";

describe("StandardPathIsolation", () => {
  describe("module isolation (TC-0012-0021)", () => {
    it("harness module can be imported independently", async () => {
      const harnessModule = await import("../../../src/core/harness/index.js");

      expect(harnessModule.runMeasurement).toBeDefined();
      expect(harnessModule.computeWeightedTotal).toBeDefined();
      expect(harnessModule.determineDecision).toBeDefined();
      expect(harnessModule.validatePanelScore).toBeDefined();
      expect(harnessModule.validateReviewer).toBeDefined();
      expect(harnessModule.resolveCommitSha).toBeDefined();
      expect(harnessModule.runFullHarness).toBeDefined();
    });
  });
});
