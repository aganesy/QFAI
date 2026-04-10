import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMeasurement } from "../../../src/core/harness/measurement.js";
import type { MeasurementInput } from "../../../src/core/harness/types.js";

describe("runMeasurement", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qfai-measurement-"));
    // Set up a minimal git repo for commitSha resolution
    const gitDir = path.join(tempDir, ".git");
    await mkdir(gitDir, { recursive: true });
    await mkdir(path.join(gitDir, "refs", "heads"), { recursive: true });
    await writeFile(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
    await writeFile(path.join(gitDir, "refs", "heads", "main"), "abcdef1234567890\n");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function makeInput(overrides: Partial<MeasurementInput> = {}): MeasurementInput {
    return {
      root: tempDir,
      reviewer: "real-reviewer",
      changeSummary: ["Initial implementation"],
      limitations: [],
      calibration: {
        packPath: ".qfai/evidence/calibration.yaml",
        thresholds: { accept: 0.8, refine: 0.5 },
        maxIterations: 15,
        plateauDelta: 0.02,
        plateauLookback: 3,
      },
      renderRefs: ["render.json#/screens/0"],
      browserQaRefs: ["browser-qa.json#/phases/0"],
      runtimeGateRefs: ["prototyping.json#/runtimeGate"],
      uiObservationRefs: ["prototyping.json#/uiObservation"],
      specCoverageRefs: ["prototyping.json#/specCoverage"],
      discussionRefs: ["20_design_eval_invariant.md"],
      screenContractRefs: ["40_screen_contracts.md#screen:dashboard"],
      trendRefs: ["04_Sources.md"],
      l1: { panel: "L1", total: 0.7, axes: [] },
      l2: { panel: "L2", total: 0.6, axes: [] },
      ...overrides,
    };
  }

  it("produces a valid iteration on first run", async () => {
    const result = await runMeasurement(makeInput());

    expect(result.iteration.iteration).toBe(1);
    expect(result.iteration.commitSha).toBe("abcdef1234567890");
    expect(result.iteration.reviewerId).toBe("real-reviewer");
    expect(result.iteration.weightedTotal).toBe(0.6); // min(0.7, 0.6)
    expect(result.iteration.decision).toBe("refine");
    expect(result.history.iterations).toHaveLength(1);
    expect(result.history.scoringTrace).toHaveLength(1);
    expect(result.isTerminal).toBe(false);
  });

  it("rejects placeholder reviewer", async () => {
    await expect(runMeasurement(makeInput({ reviewer: "qfai" }))).rejects.toThrow(/placeholder/);
  });

  it("rejects empty reviewer", async () => {
    await expect(runMeasurement(makeInput({ reviewer: "" }))).rejects.toThrow(/placeholder/);
  });

  it("rejects undefined reviewer", async () => {
    await expect(
      runMeasurement(makeInput({ reviewer: undefined as unknown as string })),
    ).rejects.toThrow(/requires --reviewer/);
  });

  it("computes weightedTotal as min(l1, l2)", async () => {
    const result = await runMeasurement(
      makeInput({
        l1: { panel: "L1", total: 0.9, axes: [] },
        l2: { panel: "L2", total: 0.3, axes: [] },
      }),
    );
    expect(result.iteration.weightedTotal).toBe(0.3);
  });

  it("single-iteration accept is NOT terminal (v1.7.15)", async () => {
    const result = await runMeasurement(
      makeInput({
        l1: { panel: "L1", total: 0.9, axes: [] },
        l2: { panel: "L2", total: 0.85, axes: [] },
      }),
    );
    expect(result.iteration.decision).toBe("accept");
    // v1.7.15: single-iteration accept does NOT produce converged
    expect(result.terminationReason).toBeUndefined();
    expect(result.isTerminal).toBe(false);
  });
});
