import { describe, expect, it } from "vitest";

import {
  derivePrototypingObligations,
  normalizeAllowedModes,
  parseDiscussionFromObject,
  requiresVisualBrowserEvidence,
  resolvePrototypingMode,
  summarizeResolvedMode,
  UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE,
  NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
} from "../../src/core/prototyping/mode.js";

describe("prototyping mode resolver", () => {
  it("prefers explicit full-harness mode", () => {
    const result = resolvePrototypingMode({
      explicitMode: "full-harness",
      discussionRecommendation: {
        recommendedMode: "full-harness",
        rationale: "legacy recommendation",
        allowedModes: ["full-harness"],
        surface: "web",
      },
    });

    expect(result).toEqual({
      requested: "full-harness",
      effective: "full-harness",
      source: "explicit-request",
      rationale: "User explicitly selected full-harness.",
    });
  });

  it("uses system default full-harness", () => {
    const result = resolvePrototypingMode({});
    expect(result.effective).toBe("full-harness");
    expect(result.source).toBe("system-default");
  });

  it("preserves discussion recommendation in summary", () => {
    const summary = summarizeResolvedMode({
      discussionRecommendation: {
        recommendedMode: "full-harness",
        rationale: "runtime proof required",
        allowedModes: ["full-harness"],
        surface: "web",
      },
    });

    expect(summary.effective).toBe("full-harness");
    expect(summary.surface).toBe("web");
    expect(summary.warnings).toEqual([]);
  });

  it("warns when explicit request conflicts with allowed_modes", () => {
    const summary = summarizeResolvedMode({
      explicitMode: "full-harness",
      discussionRecommendation: {
        recommendedMode: "full-harness",
        rationale: "legacy",
        allowedModes: [],
        surface: "web",
      },
    });

    expect(summary.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-236")]),
    );
  });

  it("normalizes allowed modes to full-harness only", () => {
    expect(normalizeAllowedModes(["standard", "full-harness", "standard", "invalid"])).toEqual([
      "full-harness",
    ]);
  });
});

describe("discussion parser", () => {
  it("parses canonical namespaced schema", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "runtime proof required",
        allowed_modes: ["full-harness"],
        surface: "web",
      },
    });

    expect(result.recommendation).toEqual({
      recommendedMode: "full-harness",
      rationale: "runtime proof required",
      allowedModes: ["full-harness"],
      surface: "web",
      sourceSchema: "canonical-namespaced",
    });
    expect(result.warnings).toEqual([]);
  });

  it("rejects stale top-level coexistence", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "full-harness",
      rationale: "stale",
      allowed_modes: ["full-harness"],
      surface: "web",
      prototyping: {
        recommended_mode: "full-harness",
        rationale: "current",
        allowed_modes: ["full-harness"],
        surface: "web",
      },
    });

    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Legacy top-level recommendation keys are not supported"),
      ]),
    );
  });
});

describe("obligation matrix", () => {
  it("full-harness + supported UI surface requires every evidence bundle", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "full-harness",
    });

    expect(obligations).toMatchObject({
      requireRuntimeGate: true,
      requireUiFidelity: true,
      requireRenderBundle: true,
      requireBrowserQaBundle: true,
      requireFullHarness: true,
      validCombination: true,
    });
  });

  it("rejects non-full-harness modes", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "standard" as never,
    });

    expect(obligations.validCombination).toBe(false);
    expect(obligations.invalidReasonCode).toBe(UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE);
  });

  it("rejects cli surface even in full-harness", () => {
    const obligations = derivePrototypingObligations({
      surface: "cli",
      effectiveMode: "full-harness",
    });

    expect(obligations.validCombination).toBe(false);
    expect(obligations.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
  });

  it("visual/browser evidence is limited to supported prototyping surfaces", () => {
    expect(requiresVisualBrowserEvidence("web")).toBe(true);
    expect(requiresVisualBrowserEvidence("mobile")).toBe(true);
    expect(requiresVisualBrowserEvidence("desktop")).toBe(true);
    expect(requiresVisualBrowserEvidence("mixed")).toBe(true);
    expect(requiresVisualBrowserEvidence("cli")).toBe(false);
  });
});
