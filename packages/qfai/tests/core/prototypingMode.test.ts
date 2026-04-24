import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROTOTYPING_MODE,
  PROTOTYPING_MAX_CYCLES,
  PROTOTYPING_MODES,
  derivePrototypingObligations,
  isValidPrototypingMode,
  type PrototypingObligations,
} from "../../src/core/review/prototyping.js";

describe("prototyping mode helpers", () => {
  it("exports the current default prototyping mode", () => {
    expect(isValidPrototypingMode(DEFAULT_PROTOTYPING_MODE)).toBe(true);
  });

  it("derives obligations for full-harness web surfaces", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "full-harness",
    });
    expect(obligations.requireRuntimeGate).toBe(true);
    expect(obligations.requireUiFidelity).toBe(true);
  });
});

describe("spec-0017 mode invariant", () => {
  // TC-0017-0001 — derivePrototypingObligations returns same obligations except maxCycles
  it("returns identical obligations across modes except maxCycles (REQ-0001)", () => {
    const lowCost = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "low-cost",
    });
    const standard = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "standard",
    });
    const fullHarness = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "full-harness",
    });

    for (const pair of [
      [lowCost, standard],
      [lowCost, fullHarness],
      [standard, fullHarness],
    ] as const) {
      const [a, b] = pair;
      const diffs: string[] = [];
      for (const key of Object.keys(a) as (keyof PrototypingObligations)[]) {
        if (key === "maxCycles" || key === "maxIterations") continue;
        if (a[key] !== b[key]) {
          diffs.push(`${key}: ${String(a[key])} vs ${String(b[key])}`);
        }
      }
      expect(
        diffs,
        `mode pair differs in fields other than maxCycles: ${diffs.join(", ")}`,
      ).toEqual([]);
    }

    expect(lowCost.maxCycles).toBe(PROTOTYPING_MAX_CYCLES["low-cost"]);
    expect(standard.maxCycles).toBe(PROTOTYPING_MAX_CYCLES.standard);
    expect(fullHarness.maxCycles).toBe(PROTOTYPING_MAX_CYCLES["full-harness"]);

    expect(lowCost.maxIterations).toBe(lowCost.maxCycles);
    expect(standard.maxIterations).toBe(standard.maxCycles);
    expect(fullHarness.maxIterations).toBe(fullHarness.maxCycles);
  });

  it("assigns PROTOTYPING_MAX_CYCLES low-cost=1 / standard=3 / full-harness=20", () => {
    expect(PROTOTYPING_MAX_CYCLES).toEqual({
      "low-cost": 1,
      standard: 3,
      "full-harness": 20,
    });
  });

  it("sets browserTool to playwright-cli for every mode (REQ-0002)", () => {
    for (const mode of PROTOTYPING_MODES) {
      const obligations = derivePrototypingObligations({
        surface: "web",
        effectiveMode: mode,
      });
      expect(obligations.browserTool).toBe("playwright-cli");
    }
  });

  it("enables the full strictest gate for every mode (REQ-0004)", () => {
    for (const mode of PROTOTYPING_MODES) {
      const obligations = derivePrototypingObligations({
        surface: "web",
        effectiveMode: mode,
      });
      // Every mode must satisfy the same strictest gate.
      expect(obligations.requireExecutionPlan).toBe(true);
      expect(obligations.requirePlaywrightEvidence).toBe(true);
      expect(obligations.requireReviewBundle).toBe(true);
      expect(obligations.requireEvaluatorReview).toBe(true);
      expect(obligations.requireBestOfHistory).toBe(true);
      expect(obligations.requireBreakthrough).toBe(true);
      expect(obligations.requireIndependentReviewerGate).toBe(true);
      expect(obligations.requirePerfect100Completion).toBe(true);

      // Legacy aliases retained for back-compat.
      expect(obligations.requireRuntimeGate).toBe(true);
      expect(obligations.requireUiFidelity).toBe(true);
      expect(obligations.requireRenderBundle).toBe(true);
      expect(obligations.requireBrowserQaBundle).toBe(true);
      expect(obligations.requireIterations).toBe(true);
    }
  });
});
