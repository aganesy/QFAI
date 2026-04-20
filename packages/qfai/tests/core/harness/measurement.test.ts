import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMeasurement } from "../../../src/core/harness/measurement.js";
import type { FullHarnessPanelScore, MeasurementInput } from "../../../src/core/harness/types.js";

const RENDER_REF = ".qfai/evidence/render.json#/screens/dashboard";
const BROWSER_QA_REF = ".qfai/evidence/browser-qa.json#/screens/dashboard";
const RUNTIME_GATE_REF = ".qfai/evidence/runtime-gate.json#/gate";
const UI_OBS_REF = ".qfai/evidence/ui-observation.json#/observation";
const SPEC_COV_REF = ".qfai/evidence/spec-coverage.json#/coverage";
const DISCUSSION_REF = ".qfai/discussion/pack-1/uiux/20_design_eval_invariant.md#L12";
const SCREEN_CONTRACT_REF = ".qfai/discussion/pack-1/uiux/40_screen_contracts.md#dashboard";
const TREND_REF = ".qfai/discussion/pack-1/04_Sources.md#L8";

function makePanel(panel: "L1" | "L2", total: number): FullHarnessPanelScore {
  return {
    panel,
    total,
    axes: [
      {
        axisId: `${panel}-axis-1`,
        score: total,
        rationale: `${panel} rationale`,
        evidenceRefs: [RENDER_REF],
      },
    ],
  };
}

describe("runMeasurement", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qfai-measurement-"));
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
      renderRefs: [RENDER_REF],
      browserQaRefs: [BROWSER_QA_REF],
      runtimeGateRefs: [RUNTIME_GATE_REF],
      uiObservationRefs: [UI_OBS_REF],
      specCoverageRefs: [SPEC_COV_REF],
      discussionRefs: [DISCUSSION_REF],
      screenContractRefs: [SCREEN_CONTRACT_REF],
      trendRefs: [TREND_REF],
      l1: makePanel("L1", 0.7),
      l2: makePanel("L2", 0.6),
      ...overrides,
    };
  }

  it("produces a valid iteration on first run", async () => {
    const result = await runMeasurement(makeInput());

    expect(result.iteration.iteration).toBe(1);
    expect(result.iteration.commitSha).toBe("abcdef1234567890");
    expect(result.iteration.reviewerId).toBe("real-reviewer");
    expect(result.iteration.weightedTotal).toBe(0.6);
    expect(result.iteration.decision).toBe("refine");
    expect(result.history.iterations).toHaveLength(1);
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
        l1: makePanel("L1", 0.9),
        l2: makePanel("L2", 0.3),
      }),
    );
    expect(result.iteration.weightedTotal).toBe(0.3);
  });

  it("single-iteration accept is NOT terminal (v1.7.15)", async () => {
    const result = await runMeasurement(
      makeInput({
        l1: makePanel("L1", 0.9),
        l2: makePanel("L2", 0.85),
      }),
    );
    expect(result.iteration.decision).toBe("accept");
    expect(result.terminationReason).toBeUndefined();
    expect(result.isTerminal).toBe(false);
  });

  describe("strict category refs", () => {
    it("rejects empty browserQaRefs", async () => {
      await expect(runMeasurement(makeInput({ browserQaRefs: [] }))).rejects.toThrow(
        /browserQaRefs/,
      );
    });

    it("rejects malformed discussion ref without fragment", async () => {
      await expect(
        runMeasurement(
          makeInput({
            discussionRefs: ["20_design_eval_invariant.md"],
          }),
        ),
      ).rejects.toThrow(/discussionRefs/);
    });

    it("rejects absolute path ref", async () => {
      await expect(
        runMeasurement(
          makeInput({
            trendRefs: ["/abs/path/04_Sources.md#L8"],
          }),
        ),
      ).rejects.toThrow(/trendRefs/);
    });

    it("rejects legacy screen contract anchor `#screen:<slug>`", async () => {
      await expect(
        runMeasurement(
          makeInput({
            screenContractRefs: [
              ".qfai/discussion/pack-1/uiux/40_screen_contracts.md#screen:dashboard",
            ],
          }),
        ),
      ).rejects.toThrow(/screenContractRefs/);
    });

    it("rejects synthetic token ref", async () => {
      await expect(
        runMeasurement(
          makeInput({
            specCoverageRefs: ["specs:spec-0001"],
          }),
        ),
      ).rejects.toThrow(/specCoverageRefs/);
    });
  });

  describe("strict panel score", () => {
    it("rejects empty l1 axes", async () => {
      await expect(
        runMeasurement(
          makeInput({
            l1: { panel: "L1", total: 0.7, axes: [] },
          }),
        ),
      ).rejects.toThrow(/L1/);
    });

    it("rejects empty l2 axes", async () => {
      await expect(
        runMeasurement(
          makeInput({
            l2: { panel: "L2", total: 0.6, axes: [] },
          }),
        ),
      ).rejects.toThrow(/L2/);
    });

    it("rejects axis with empty evidenceRefs", async () => {
      await expect(
        runMeasurement(
          makeInput({
            l1: {
              panel: "L1",
              total: 0.7,
              axes: [
                {
                  axisId: "bad-axis",
                  score: 0.7,
                  rationale: "r",
                  evidenceRefs: [],
                },
              ],
            },
          }),
        ),
      ).rejects.toThrow(/evidenceRef/);
    });

    it("rejects axis with malformed evidenceRef", async () => {
      await expect(
        runMeasurement(
          makeInput({
            l2: {
              panel: "L2",
              total: 0.6,
              axes: [
                {
                  axisId: "bad-axis",
                  score: 0.6,
                  rationale: "r",
                  evidenceRefs: ["not a ref"],
                },
              ],
            },
          }),
        ),
      ).rejects.toThrow(/evidenceRef/);
    });
  });
});
