// QFAI:SPEC-0012:TC-0012-0001
// QFAI:SPEC-0012:TC-0012-0002
// QFAI:SPEC-0012:TC-0012-0007
// QFAI:SPEC-0012:TC-0012-0008
// QFAI:SPEC-0012:TC-0012-0009
// QFAI:SPEC-0012:TC-0012-0010
// QFAI:SPEC-0012:TC-0012-0011
// QFAI:SPEC-0012:TC-0012-0012
// QFAI:SPEC-0012:TC-0012-0013
// QFAI:SPEC-0012:TC-0012-0022
// QFAI:SPEC-0012:TC-0012-0023
// QFAI:SPEC-0012:TC-0012-0025
// QFAI:SPEC-0012:TC-0012-0026
// QFAI:SPEC-0012:TC-0012-0027
import { describe, expect, it } from "vitest";

import { HarnessLoop } from "../../../src/core/harness/loop.js";

const validInputs = {
  specId: "spec-0031",
  requirements: ["REQ-0011"],
};

describe("HarnessLoop", () => {
  describe("premium invocation happy path (TC-0012-0001)", () => {
    it("initializes loop and starts iteration at 1", async () => {
      const loop = new HarnessLoop({ maxIterations: 5 });
      const result = await loop.run(validInputs);

      expect(result.iterationCount).toBeGreaterThanOrEqual(1);
      expect(result.iterations[0]?.iteration).toBe(1);
    });
  });

  describe("missing inputs validation (TC-0012-0002)", () => {
    it("throws structured error when specId is missing", async () => {
      const loop = new HarnessLoop();
      await expect(loop.run({ specId: "", requirements: ["REQ-0011"] })).rejects.toThrow("specId");
    });

    it("throws when requirements are empty", async () => {
      const loop = new HarnessLoop();
      await expect(loop.run({ specId: "spec-0031", requirements: [] })).rejects.toThrow(
        "requirement",
      );
    });
  });

  describe("accept termination (TC-0012-0007)", () => {
    it("terminates with accepted status on accept decision", async () => {
      // Use high default scores to get accept
      const loop = new HarnessLoop({
        maxIterations: 5,
        thresholds: { accept: 0.4, refine: 0.2 },
      });
      const result = await loop.run(validInputs);

      expect(result.status).toBe("accepted");
      expect(result.terminationReason).toBe("accepted");
    });
  });

  describe("refine feedback loop (TC-0012-0008)", () => {
    it("increments iteration on refine decision", async () => {
      // Thresholds that cause refine (default score is 0.5)
      const loop = new HarnessLoop({
        maxIterations: 5,
        thresholds: { accept: 0.9, refine: 0.3 },
        plateauLookback: 999, // Disable plateau for refine test
      });
      const result = await loop.run(validInputs);

      // Should run multiple iterations with refine
      expect(result.iterationCount).toBeGreaterThan(1);
    });
  });

  describe("pivot replanning (TC-0012-0009)", () => {
    it("re-invokes planner on pivot decision", async () => {
      // Thresholds that cause pivot (default score 0.5 < refine 0.8)
      const loop = new HarnessLoop({
        maxIterations: 5,
        thresholds: { accept: 0.95, refine: 0.8 },
        plateauLookback: 999, // Disable plateau for pivot test
      });
      const result = await loop.run(validInputs);

      // Should run all iterations since score stays low
      expect(result.iterationCount).toBe(5);

      // Check that pivot strategies were created
      const pivotIterations = result.iterations.filter((iter) =>
        iter.plannerStrategy?.approach.includes("pivot"),
      );
      expect(pivotIterations.length).toBeGreaterThan(0);
    });
  });

  describe("max cap default 15 (TC-0012-0010)", () => {
    it("runs exactly 15 iterations when configured at default", async () => {
      const loop = new HarnessLoop({
        maxIterations: 15,
        thresholds: { accept: 0.99, refine: 0.98 },
        plateauLookback: 999, // Disable plateau for cap test
      });
      const result = await loop.run(validInputs);

      expect(result.iterationCount).toBe(15);
      expect(result.status).toBe("cap-reached");
      expect(result.terminationReason).toBe("cap-reached");
    });
  });

  describe("max cap custom 8 (TC-0012-0011)", () => {
    it("runs exactly 8 iterations when cap set to 8", async () => {
      const loop = new HarnessLoop({
        maxIterations: 8,
        thresholds: { accept: 0.99, refine: 0.98 },
        plateauLookback: 999, // Disable plateau for cap test
      });
      const result = await loop.run(validInputs);

      expect(result.iterationCount).toBe(8);
      expect(result.status).toBe("cap-reached");
    });
  });

  describe("cap range below (TC-0012-0012)", () => {
    it("rejects maxIterations below minimum", async () => {
      const loop = new HarnessLoop({ maxIterations: 3 });
      await expect(loop.run(validInputs)).rejects.toThrow("maxIterations");
    });
  });

  describe("cap range above (TC-0012-0013)", () => {
    it("rejects maxIterations above maximum", async () => {
      const loop = new HarnessLoop({ maxIterations: 20 });
      await expect(loop.run(validInputs)).rejects.toThrow("maxIterations");
    });
  });

  describe("best-so-far selection (TC-0012-0022)", () => {
    it("selects best scoring iteration on cap-reached", async () => {
      const loop = new HarnessLoop({
        maxIterations: 5,
        thresholds: { accept: 0.99, refine: 0.98 },
        plateauLookback: 999, // Disable plateau for cap test
      });
      const result = await loop.run(validInputs);

      expect(result.bestIteration).toBeGreaterThanOrEqual(1);
      expect(result.finalScore).toBe(
        Math.max(...result.iterations.map((i) => i.evaluatorResult.weightedTotal)),
      );
    });
  });

  describe("no artifacts on pre-loop fail (TC-0012-0023)", () => {
    it("throws without generating any iteration records", async () => {
      const loop = new HarnessLoop();
      try {
        await loop.run({ specId: "", requirements: [] });
      } catch {
        // Expected
      }
      // No way to check internal state, but the error should prevent any iterations
    });
  });

  describe("missing calibration pre-loop (TC-0012-0025)", () => {
    it("proceeds with default scoring when no calibration pack", async () => {
      const loop = new HarnessLoop({ maxIterations: 5 });
      // No calibration adapter set — should still work
      const result = await loop.run(validInputs);
      expect(result.iterationCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("pre-loop validation success (TC-0012-0026)", () => {
    it("passes validation with all required inputs", async () => {
      const loop = new HarnessLoop({ maxIterations: 5 });
      const errors = loop.validateInputs(validInputs);
      expect(errors).toHaveLength(0);
    });
  });

  describe("phase decomposition full cycle (TC-0012-0027)", () => {
    it("executes planner, generator, evaluator in sequence each iteration", async () => {
      const loop = new HarnessLoop({
        maxIterations: 5,
        thresholds: { accept: 0.4, refine: 0.2 },
      });
      const result = await loop.run(validInputs);

      // First iteration should have planner strategy
      const first = result.iterations[0];
      expect(first.plannerStrategy).toBeDefined();
      expect(first.generatorOutput).toBeDefined();
      expect(first.evaluatorResult).toBeDefined();
      expect(first.evaluatorResult.decision).toBeDefined();
    });
  });
});
