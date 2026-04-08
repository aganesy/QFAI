/**
 * Full-harness runtime tests — WS-4 measurement-driven model
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runFullHarness, type FullHarnessRequest } from "../../src/core/harness/runtime.js";
import type { FullHarnessAdapters } from "../../src/core/harness/adapters.js";

async function withRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-harness-"));
  try {
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    // Full-harness requires a git repo for resolveCommitSha
    await mkdir(path.join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf-8");
    await writeFile(
      path.join(root, ".git", "refs", "heads", "main"),
      "abc1234567890abcdef1234567890abcdef123456\n",
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function makeRequest(
  root: string,
  overrides: Partial<FullHarnessRequest> = {},
): FullHarnessRequest {
  return {
    root,
    reviewer: "test-reviewer",
    changeSummary: ["Initial measurement"],
    limitations: [],
    calibration: {
      packPath: ".qfai/evidence/calibration.yaml",
      packVersion: "1.0.0",
      configPath: "qfai.config.yaml",
      thresholds: { accept: 0.8, refine: 0.5 },
      maxIterations: 5,
      plateauDelta: 0.02,
      plateauLookback: 3,
    },
    l1: { panel: "L1", total: 0, axes: [] },
    l2: { panel: "L2", total: 0, axes: [] },
    ...overrides,
  };
}

describe("runFullHarness", () => {
  it("TC-D1: 1 iteration accept → converged", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          l1: { panel: "L1", total: 1.0, axes: [] },
          l2: { panel: "L2", total: 1.0, axes: [] },
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.isTerminal).toBe(true);
      expect(result.terminationReason).toBe("converged");
      expect(result.history.iterations.length).toBeGreaterThan(0);
      expect(result.history.scoringTrace.length).toBeGreaterThan(0);
    });
  });

  it("TC-D3: low scores → not terminal on first iteration", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.99, refine: 0.98 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.isTerminal).toBe(false);
      expect(result.history.iterations.length).toBe(1);
    });
  });

  it("TC-D4: UI-bearing surface → calls render and Browser QA", async () => {
    await withRoot(async (root) => {
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
        makeRequest(root, {
          adapters,
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(renderCalled).toBe(true);
      expect(qaCalled).toBe(true);
    });
  });

  it("TC-D5: CLI surface → UI steps skipped", async () => {
    await withRoot(async (root) => {
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
        makeRequest(root, {
          adapters,
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(renderCalled).toBe(false);
      expect(qaCalled).toBe(false);
    });
  });

  it("TC-D6: result writer produces expected summary", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.iteration).toBeDefined();
      expect(typeof result.iteration.iteration).toBe("number");
      expect(result.history.runId).toBeTruthy();
      expect(result.calibrationRef).toBeDefined();
      expect(result.calibrationRef.configPath).toBe("qfai.config.yaml");
    });
  });

  it("observability adapter receives iteration records", async () => {
    await withRoot(async (root) => {
      const records: Array<{ iteration: number; score: number; decision: string }> = [];
      let flushed = false;

      const adapters: FullHarnessAdapters = {
        surface: "web",
        observability: {
          recordIteration: (data) => {
            records.push(data);
          },
          flush: async () => {
            flushed = true;
          },
        },
      };

      await runFullHarness(
        makeRequest(root, {
          adapters,
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(records.length).toBeGreaterThan(0);
      expect(flushed).toBe(true);
    });
  });

  it("generates evidence and review summary", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.0.0",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.history.runId).toBeTruthy();
      expect(result.iteration).toBeDefined();
      expect(result.fakeUiDetection).toBeDefined();
      expect(result.handoff).toBeDefined();
    });
  });
});
