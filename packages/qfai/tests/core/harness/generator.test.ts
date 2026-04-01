// QFAI:SPEC-0012:TC-0012-0004
import { describe, expect, it } from "vitest";

import { Generator } from "../../../src/core/harness/generator.js";

describe("Generator", () => {
  describe("output from plan (TC-0012-0004)", () => {
    it("generates output conforming to plan constraints", () => {
      const generator = new Generator();
      const output = generator.generate({
        approach: "Generate REQ-0011 implementation",
        constraints: ["TypeScript", "pure functions"],
        budgetGuidance: "Standard allocation",
      });

      expect(output.content).toBeTruthy();
      expect(output.metadata).toBeDefined();
    });

    it("incorporates feedback on refine", () => {
      const generator = new Generator();
      const output = generator.generate(
        {
          approach: "Generate REQ-0011",
          constraints: [],
          budgetGuidance: "Standard",
        },
        "Improve error handling",
      );

      expect(output.content).toContain("Refined");
      expect(output.content).toContain("Feedback incorporated");
    });
  });
});
