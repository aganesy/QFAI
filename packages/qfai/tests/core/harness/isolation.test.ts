// QFAI:SPEC-0012:TC-0012-0021
import { describe, expect, it } from "vitest";

describe("StandardPathIsolation", () => {
  describe("module isolation (TC-0012-0021)", () => {
    it("harness module can be imported independently", async () => {
      const harnessModule = await import("../../../src/core/harness/index.js");

      expect(harnessModule.HarnessLoop).toBeDefined();
      expect(harnessModule.Planner).toBeDefined();
      expect(harnessModule.Generator).toBeDefined();
      expect(harnessModule.Evaluator).toBeDefined();
    });
  });
});
