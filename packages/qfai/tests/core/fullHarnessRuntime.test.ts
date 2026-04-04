/**
 * Full-harness runtime tests — WS-D
 */
import { describe, expect, it } from "vitest";

import { runFullHarness, type FullHarnessRequest } from "../../src/core/harness/runtime.js";
import type { FullHarnessAdapters } from "../../src/core/harness/adapters.js";
import type { SpecInputs } from "../../src/core/harness/types.js";

const baseInputs: SpecInputs = {
  specId: "spec-test-001",
  requirements: ["REQ-001: The system shall pass"],
};

function makeRequest(overrides: Partial<FullHarnessRequest> = {}): FullHarnessRequest {
  return {
    inputs: baseInputs,
    config: {
      maxIterations: 5,
      thresholds: { accept: 0.8, refine: 0.5 },
    },
    ...overrides,
  };
}

describe("runFullHarness", () => {
  it("TC-D1: 1 iteration accept → converged", async () => {
    const result = await runFullHarness(
      makeRequest({
        config: {
          maxIterations: 5,
          thresholds: { accept: 0.1, refine: 0.05 },
        },
      }),
    );

    expect(result.loopResult.status).toBe("converged");
    expect(result.output.mode).toBe("full-harness");
    expect(result.output.terminationReason).toBe("converged");
    expect(result.output.iterations).toBe(result.loopResult.iterationCount);
  });

  it("TC-D3: max_iterations → exits", async () => {
    const result = await runFullHarness(
      makeRequest({
        config: {
          maxIterations: 5,
          thresholds: { accept: 0.99, refine: 0.98 },
        },
      }),
    );

    // Will either be max-iterations or plateau since accept threshold is very high
    expect(["max-iterations", "plateau"]).toContain(result.loopResult.status);
    expect(result.output.mode).toBe("full-harness");
  });

  it("TC-D4: UI-bearing surface → calls render and Browser QA", async () => {
    let renderCalled = false;
    let qaCalled = false;

    const adapters: FullHarnessAdapters = {
      surface: "web",
      render: {
        captureEvidence: async () => {
          renderCalled = true;
          return { entries: [], filesWritten: [] };
        },
      },
      browserQa: {
        runQa: async () => {
          qaCalled = true;
          return { phases: [], provider: "test", timestamp: new Date().toISOString() };
        },
      },
    };

    await runFullHarness(
      makeRequest({
        adapters,
        config: { maxIterations: 5, thresholds: { accept: 0.1, refine: 0.05 } },
      }),
    );

    expect(renderCalled).toBe(true);
    expect(qaCalled).toBe(true);
  });

  it("TC-D5: CLI surface → UI steps skipped", async () => {
    let renderCalled = false;
    let qaCalled = false;

    const adapters: FullHarnessAdapters = {
      surface: "cli",
      render: {
        captureEvidence: async () => {
          renderCalled = true;
          return { entries: [], filesWritten: [] };
        },
      },
      browserQa: {
        runQa: async () => {
          qaCalled = true;
          return { phases: [], provider: "test", timestamp: new Date().toISOString() };
        },
      },
    };

    await runFullHarness(
      makeRequest({
        adapters,
        config: { maxIterations: 5, thresholds: { accept: 0.1, refine: 0.05 } },
      }),
    );

    expect(renderCalled).toBe(false);
    expect(qaCalled).toBe(false);
  });

  it("TC-D6: result writer produces expected summary", async () => {
    const result = await runFullHarness(
      makeRequest({
        config: { maxIterations: 5, thresholds: { accept: 0.1, refine: 0.05 } },
      }),
    );

    expect(result.output.mode).toBe("full-harness");
    expect(typeof result.output.iterations).toBe("number");
    expect(typeof result.output.terminationReason).toBe("string");
    expect(result.output.evaluationSummary).toBeDefined();
    expect(result.output.evidenceSummary).toBeDefined();
    expect(result.output.browserQaSummary).toBeDefined();
    expect(result.output.calibrationSummary).toBeDefined();
  });

  it("observability adapter receives iteration records", async () => {
    const records: Array<{ iteration: number; score: number; decision: string }> = [];
    let flushed = false;

    const adapters: FullHarnessAdapters = {
      surface: "web",
      observability: {
        recordIteration: (data) => { records.push(data); },
        flush: async () => { flushed = true; },
      },
    };

    await runFullHarness(
      makeRequest({
        adapters,
        config: { maxIterations: 5, thresholds: { accept: 0.1, refine: 0.05 } },
      }),
    );

    expect(records.length).toBeGreaterThan(0);
    expect(flushed).toBe(true);
  });

  it("generates evidence and review summary", async () => {
    const result = await runFullHarness(
      makeRequest({
        config: { maxIterations: 5, thresholds: { accept: 0.1, refine: 0.05 } },
      }),
    );

    expect(result.evidence.runId).toBeTruthy();
    expect(result.evidence.timestamp).toBeTruthy();
    expect(result.reviewSummary.recommendation).toBeTruthy();
  });
});
