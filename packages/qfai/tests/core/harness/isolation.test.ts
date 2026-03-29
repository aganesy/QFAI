// QFAI:SPEC-0031:TC-0031-0020
// QFAI:SPEC-0031:TC-0031-0021
import { describe, expect, it } from "vitest";

describe("StandardPathIsolation", () => {
  describe("no premium activation (TC-0031-0020)", () => {
    it("standard prototyping does not export harness symbols", async () => {
      // Verify that the standard prototyping path doesn't pull in harness
      const prototypingModule = await import("../../../src/core/prototyping/index.js");

      // The standard prototyping module should not export harness-related symbols
      expect(prototypingModule).not.toHaveProperty("HarnessLoop");
      expect(prototypingModule).not.toHaveProperty("Planner");
      expect(prototypingModule).not.toHaveProperty("Evaluator");
    });
  });

  describe("module isolation (TC-0031-0021)", () => {
    it("harness module can be imported independently", async () => {
      const harnessModule = await import("../../../src/core/harness/index.js");

      expect(harnessModule.HarnessLoop).toBeDefined();
      expect(harnessModule.Planner).toBeDefined();
      expect(harnessModule.Generator).toBeDefined();
      expect(harnessModule.Evaluator).toBeDefined();
    });
  });
});
