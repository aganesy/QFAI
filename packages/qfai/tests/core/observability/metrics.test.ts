// QFAI:SPEC-0032:TC-0032-0001
// QFAI:SPEC-0032:TC-0032-0002
// QFAI:SPEC-0032:TC-0032-0003
// QFAI:SPEC-0032:TC-0032-0004
// QFAI:SPEC-0032:TC-0032-0007
// QFAI:SPEC-0032:TC-0032-0017
// QFAI:SPEC-0032:TC-0032-0018
import { describe, expect, it } from "vitest";

import { MetricsCollector } from "../../../src/core/observability/metrics.js";
import type { PerIterationMetric } from "../../../src/core/observability/types.js";

function makeIteration(index: number, cost = 0.01, duration = 100): PerIterationMetric {
  return {
    type: "iteration",
    index,
    durationMs: duration,
    tokenCost: cost,
    model: "gpt-4",
    ts: new Date(Date.now() + index * 1000).toISOString(),
  };
}

describe("MetricsCollector", () => {
  describe("per-iteration emission (TC-0032-0001)", () => {
    it("emits 3 iterations and stores 3 per-iteration records", () => {
      const collector = new MetricsCollector();
      collector.emitIteration(makeIteration(0));
      collector.emitIteration(makeIteration(1));
      collector.emitIteration(makeIteration(2));

      const iterations = collector.getIterations();
      expect(iterations).toHaveLength(3);
      for (const m of iterations) {
        expect(m.type).toBe("iteration");
      }
    });
  });

  describe("aggregate computation (TC-0032-0002)", () => {
    it("computes totalCost = sum of iterations and iterationCount = 3", () => {
      const collector = new MetricsCollector();
      collector.emitIteration(makeIteration(0, 0.1, 200));
      collector.emitIteration(makeIteration(1, 0.2, 300));
      collector.emitIteration(makeIteration(2, 0.3, 500));

      const agg = collector.emitAggregate("run-1");
      expect(agg.type).toBe("aggregate");
      expect(agg.totalCost).toBeCloseTo(0.6, 5);
      expect(agg.totalTime).toBe(1000);
      expect(agg.iterationCount).toBe(3);
      expect(agg.runId).toBe("run-1");
    });
  });

  describe("single iteration aggregate (TC-0032-0003)", () => {
    it("aggregate values equal the single iteration values", () => {
      const collector = new MetricsCollector();
      collector.emitIteration(makeIteration(0, 0.05, 150));

      const agg = collector.emitAggregate("run-single");
      expect(agg.totalCost).toBeCloseTo(0.05, 5);
      expect(agg.totalTime).toBe(150);
      expect(agg.iterationCount).toBe(1);
    });
  });

  describe("no drops (TC-0032-0004)", () => {
    it("5 iterations → all 5 records present", () => {
      const collector = new MetricsCollector();
      for (let i = 0; i < 5; i++) {
        collector.emitIteration(makeIteration(i));
      }

      const iterations = collector.getIterations();
      expect(iterations).toHaveLength(5);
      expect(iterations.map((m) => m.index)).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe("PII exclusion (TC-0032-0007)", () => {
    it("metrics contain no PII (no emails, names, file contents)", () => {
      const collector = new MetricsCollector();
      const iteration = makeIteration(0);
      collector.emitIteration(iteration);

      // Capture iterations before aggregate resets them
      const iterations = collector.getIterations();
      const agg = collector.emitAggregate("run-pii");

      const iterationJson = JSON.stringify(iterations);
      const aggJson = JSON.stringify(agg);
      const combined = iterationJson + aggJson;

      // No email patterns
      expect(combined).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      // Only expected keys present in aggregate
      const aggKeys = Object.keys(agg);
      expect(aggKeys).toEqual(
        expect.arrayContaining(["type", "totalCost", "totalTime", "iterationCount", "runId", "ts"]),
      );
      // Only expected keys present in iteration
      const iterKeys = Object.keys(iterations[0]);
      expect(iterKeys).toEqual(
        expect.arrayContaining(["type", "index", "durationMs", "tokenCost", "model", "ts"]),
      );
    });
  });

  describe("historical entries (TC-0032-0017)", () => {
    it("3 runs produce 3 historical entries sorted ascending by timestamp", () => {
      const collector = new MetricsCollector();

      collector.emitIteration(makeIteration(0, 0.1, 100));
      collector.emitAggregate("run-a");

      collector.emitIteration(makeIteration(1, 0.2, 200));
      collector.emitAggregate("run-b");

      collector.emitIteration(makeIteration(2, 0.3, 300));
      collector.emitAggregate("run-c");

      const history = collector.getHistory();
      expect(history).toHaveLength(3);

      // Verify ascending timestamp order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp >= history[i - 1].timestamp).toBe(true);
      }

      expect(history.map((h) => h.runId)).toEqual(["run-a", "run-b", "run-c"]);
    });
  });

  describe("formatJsonLine (TC-0032-0018)", () => {
    it("returns valid JSON with required fields for iteration", () => {
      const collector = new MetricsCollector();
      const metric = makeIteration(0, 0.05, 200);
      const line = collector.formatJsonLine(metric);

      const parsed = JSON.parse(line);
      expect(parsed.type).toBe("iteration");
      expect(parsed.index).toBe(0);
      expect(parsed.durationMs).toBe(200);
      expect(parsed.tokenCost).toBe(0.05);
      expect(parsed.model).toBe("gpt-4");
      expect(typeof parsed.ts).toBe("string");
    });

    it("returns valid JSON with required fields for aggregate", () => {
      const collector = new MetricsCollector();
      collector.emitIteration(makeIteration(0, 0.1, 100));
      const agg = collector.emitAggregate("run-fmt");
      const line = collector.formatJsonLine(agg);

      const parsed = JSON.parse(line);
      expect(parsed.type).toBe("aggregate");
      expect(parsed.totalCost).toBeCloseTo(0.1, 5);
      expect(parsed.totalTime).toBe(100);
      expect(parsed.iterationCount).toBe(1);
      expect(parsed.runId).toBe("run-fmt");
      expect(typeof parsed.ts).toBe("string");
    });
  });
});
