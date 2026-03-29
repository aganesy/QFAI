// QFAI:SPEC-0031:TC-0031-0003
import { describe, expect, it } from "vitest";

import { Planner } from "../../../src/core/harness/planner.js";

describe("Planner", () => {
  describe("strategy production (TC-0031-0003)", () => {
    it("creates a strategy with approach, constraints, and budgetGuidance", () => {
      const planner = new Planner();
      const strategy = planner.createStrategy({
        specId: "spec-0031",
        requirements: ["REQ-0011", "REQ-0012"],
        constraints: ["must use TypeScript"],
      });

      expect(strategy.approach).toBeTruthy();
      expect(strategy.constraints).toContain("must use TypeScript");
      expect(strategy.budgetGuidance).toBeTruthy();
    });

    it("creates revised strategy on pivot", () => {
      const planner = new Planner();
      const strategy = planner.createStrategy(
        { specId: "spec-0031", requirements: ["REQ-0011"] },
        "Previous approach failed due to complexity",
      );

      expect(strategy.approach).toContain("pivot");
      expect(strategy.budgetGuidance).toContain("Revised");
    });
  });
});
