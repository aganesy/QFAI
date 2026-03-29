// QFAI:SPEC-0032:TC-0032-0005
// QFAI:SPEC-0032:TC-0032-0006
import { describe, expect, it } from "vitest";

import { MetricsWriter } from "../../../src/core/observability/writer.js";
import type { PerIterationMetric, AggregateMetric } from "../../../src/core/observability/types.js";

function makeIteration(index: number): PerIterationMetric {
  return {
    type: "iteration",
    index,
    durationMs: 100,
    tokenCost: 0.01,
    model: "gpt-4",
    ts: new Date().toISOString(),
  };
}

function makeAggregate(runId: string): AggregateMetric {
  return {
    type: "aggregate",
    totalCost: 0.03,
    totalTime: 300,
    iterationCount: 3,
    runId,
    ts: new Date().toISOString(),
  };
}

describe("MetricsWriter", () => {
  describe("sink failure buffering (TC-0032-0005)", () => {
    it("buffers records and logs warning when sink is down, exits cleanly", () => {
      const writer = new MetricsWriter();
      writer.setSinkAvailable(false);

      writer.write(makeIteration(0));
      writer.write(makeIteration(1));

      const buffer = writer.getBuffer();
      expect(buffer).toHaveLength(2);

      const warnings = writer.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain("Sink unavailable");

      // Written (direct) should be empty
      expect(writer.getWritten()).toHaveLength(0);
    });
  });

  describe("sink recovery flush (TC-0032-0006)", () => {
    it("flushes 2 buffered + 1 direct = 3 total after sink recovery", () => {
      const writer = new MetricsWriter();

      // Sink down — buffer 2 records
      writer.setSinkAvailable(false);
      writer.write(makeIteration(0));
      writer.write(makeIteration(1));
      expect(writer.getBuffer()).toHaveLength(2);

      // Sink restored — auto-flushes buffer on setSinkAvailable(true)
      writer.setSinkAvailable(true);

      // Buffer should be empty after auto-flush
      expect(writer.getBuffer()).toHaveLength(0);

      // Write 1 more directly
      writer.write(makeAggregate("run-recovery"));

      // Total written = 2 auto-flushed + 1 direct = 3
      expect(writer.getWritten()).toHaveLength(3);
    });
  });
});
