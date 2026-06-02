/**
 * Unit: `qfai prototyping certify` rejects loops containing
 * exploration-mode iterations.
 *
 * - TC-0012-0476: certify rejects sealing with
 *   `R-EXPLORATION-CERTIFY-ATTEMPT` AND `acceptedIterationIndex` MUST
 *   resolve to a convergence-mode iteration only.
 *
 * The detector lives at `core/validators/prototyping/explorationCertify.ts`
 * (`detectExplorationCertifyAttempt`).
 */
// QFAI:SPEC-0012:TC-0012-0476

import { describe, expect, it } from "vitest";

import {
  detectExplorationCertifyAttempt,
  resolveCertifyAcceptedIterationIndex,
} from "../../../../src/core/validators/prototyping/explorationCertify.js";
import { extractIterationViewsForCertify } from "../../../../src/cli/commands/prototypingCertify.js";

describe("TC-0012-0476: certify against exploration-mode iterations emits R-EXPLORATION-CERTIFY-ATTEMPT", () => {
  it("fires (error) when any iteration was produced under exploration mode", () => {
    const issues = detectExplorationCertifyAttempt({
      iterations: [
        { index: 0, mode: "convergence" },
        { index: 1, mode: "exploration" },
        { index: 2, mode: "convergence" },
      ],
    });
    const finding = issues.find((i) => i.code === "R-EXPLORATION-CERTIFY-ATTEMPT");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/iter/i);
    expect(finding?.message).toMatch(/exploration/i);
  });

  it("does NOT fire when every iteration is convergence", () => {
    const issues = detectExplorationCertifyAttempt({
      iterations: [
        { index: 0, mode: "convergence" },
        { index: 1, mode: "convergence" },
      ],
    });
    expect(issues.filter((i) => i.code === "R-EXPLORATION-CERTIFY-ATTEMPT")).toEqual([]);
  });

  it("does NOT fire when mode field is absent (legacy iterations default to convergence)", () => {
    const issues = detectExplorationCertifyAttempt({
      iterations: [{ index: 0 }, { index: 1 }],
    });
    expect(issues.filter((i) => i.code === "R-EXPLORATION-CERTIFY-ATTEMPT")).toEqual([]);
  });
});

describe("TC-0012-0476: acceptedIterationIndex resolves to convergence-mode iterations only", () => {
  it("returns the highest-index convergence iteration when present", () => {
    const idx = resolveCertifyAcceptedIterationIndex([
      { index: 0, mode: "convergence" },
      { index: 1, mode: "exploration" },
      { index: 2, mode: "convergence" },
      { index: 3, mode: "exploration" },
    ]);
    expect(idx).toBe(2);
  });

  it("returns null when every iteration is exploration-mode", () => {
    const idx = resolveCertifyAcceptedIterationIndex([
      { index: 0, mode: "exploration" },
      { index: 1, mode: "exploration" },
    ]);
    expect(idx).toBeNull();
  });

  it("treats missing mode as convergence (legacy compatibility)", () => {
    const idx = resolveCertifyAcceptedIterationIndex([
      { index: 0 },
      { index: 1, mode: "exploration" },
    ]);
    expect(idx).toBe(0);
  });
});

// Pin cross-surface mode consistency (codex r3338416753):
// `extractIterationViewsForCertify` (certify) MUST inherit the most-
// recent explicit mode for iterations that omit `mode`, matching
// `readPrototypingModeForRelax` (validate-relax). Without this, an
// `iterate --cycle 0 --mode exploration` loop whose later iteration
// writer omits `mode` would get warning-only soft-gate relaxation
// (validate sees exploration) AND pass certify (certify saw
// convergence) — opening the "soft-relaxed exploration loop sealed by
// certify" window.
describe("extractIterationViewsForCertify (sticky-mode inheritance)", () => {
  it("inherits the most-recent explicit mode for iterations that omit `mode`", () => {
    const views = extractIterationViewsForCertify({
      iterations: [{ index: 0, mode: "exploration" }, { index: 1 }],
    });
    expect(views).toEqual([
      { index: 0, mode: "exploration" },
      { index: 1, mode: "exploration" },
    ]);
  });

  it("an explicit later mode overrides the inherited posture", () => {
    const views = extractIterationViewsForCertify({
      iterations: [
        { index: 0, mode: "exploration" },
        { index: 1 },
        { index: 2, mode: "convergence" },
      ],
    });
    expect(views).toEqual([
      { index: 0, mode: "exploration" },
      { index: 1, mode: "exploration" },
      { index: 2, mode: "convergence" },
    ]);
  });

  it("leaves mode undefined when no prior iteration has set it (legacy)", () => {
    const views = extractIterationViewsForCertify({
      iterations: [{ index: 0 }, { index: 1 }],
    });
    expect(views).toEqual([{ index: 0 }, { index: 1 }]);
  });

  it("the sticky views drive R-EXPLORATION-CERTIFY-ATTEMPT — a no-mode iteration after exploration is rejected", () => {
    const views = extractIterationViewsForCertify({
      iterations: [{ index: 0, mode: "exploration" }, { index: 1 }],
    });
    const issues = detectExplorationCertifyAttempt({ iterations: views });
    const finding = issues.find((i) => i.code === "R-EXPLORATION-CERTIFY-ATTEMPT");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
  });
});
