import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  derivePrototypingObligations,
  inferSurfaceFromRecommendationAndEvidence,
  normalizeAllowedModes,
  parseDiscussionFromObject,
  parseDiscussionModeRecommendation,
  parseDiscussionModeRecommendationWithWarnings,
  requiresVisualBrowserEvidence,
  resolvePrototypingMode,
  summarizeResolvedMode,
} from "../../src/core/prototyping/mode.js";

describe("prototyping mode resolver", () => {
  it("prefers explicit mode over discussion recommendation", () => {
    const result = resolvePrototypingMode({
      explicitMode: "full-harness",
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "default recommendation",
        allowedModes: ["standard"],
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

  it("summarizes resolved mode with discussion recommendation", () => {
    const summary = summarizeResolvedMode({
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "customer presentable",
        allowedModes: ["standard"],
        surface: "web",
      },
    });

    expect(summary.effective).toBe("standard");
    expect(summary.source).toBe("discussion-recommendation");
    expect(summary.discussionRecommendation?.surface).toBe("web");
    expect(summary.surface).toBe("web");
  });

  it("falls back to standard default", () => {
    const result = resolvePrototypingMode({});
    expect(result.effective).toBe("standard");
    expect(result.source).toBe("system-default");
  });

  it("normalizes allowed modes by de-duplicating valid entries", () => {
    expect(normalizeAllowedModes(["standard", "full-harness", "standard", "invalid"])).toEqual([
      "full-harness",
      "standard",
    ]);
  });

  it("detects visual/browser evidence surfaces", () => {
    expect(requiresVisualBrowserEvidence("web")).toBe(true);
    expect(requiresVisualBrowserEvidence("mobile")).toBe(true);
    expect(requiresVisualBrowserEvidence("desktop")).toBe(true);
    expect(requiresVisualBrowserEvidence("mixed")).toBe(true);
    expect(requiresVisualBrowserEvidence("cli")).toBe(false);
  });

  it("recommendation overrides default", () => {
    const result = resolvePrototypingMode({
      discussionRecommendation: {
        recommendedMode: "low-cost",
        rationale: "early prototype",
        allowedModes: ["low-cost"],
        surface: "web",
      },
    });
    expect(result.effective).toBe("low-cost");
    expect(result.source).toBe("discussion-recommendation");
  });

  it("warns when requested mode is not in allowed_modes", () => {
    const summary = summarizeResolvedMode({
      explicitMode: "full-harness",
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "default recommendation",
        allowedModes: ["low-cost", "standard"],
        surface: "web",
      },
    });
    expect(summary.effective).toBe("full-harness");
    expect(summary.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-236")]),
    );
  });

  it("does not warn when recommendation uses canonical-namespaced schema", () => {
    const summary = summarizeResolvedMode({
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "default",
        allowedModes: ["standard"],
        surface: "web",
        sourceSchema: "canonical-namespaced",
      },
    });
    expect(summary.warnings).toEqual([]);
  });
});

describe("canonical-namespaced-only parser", () => {
  it("returns null for legacy top-level yaml (no longer supported)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-mode-"));
    try {
      await mkdir(root, { recursive: true });
      const target = path.join(root, "prototyping.yaml");
      await writeFile(
        target,
        [
          "recommended_mode: standard",
          "rationale: customer presentable",
          "allowed_modes:",
          "  - low-cost",
          "  - standard",
          "surface: web",
          "updated_at: 2026-04-04T00:00:00Z",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(parseDiscussionModeRecommendation(target)).resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("parses namespaced canonical schema", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-mode-ns-"));
    try {
      await mkdir(root, { recursive: true });
      const target = path.join(root, "prototyping.yaml");
      await writeFile(
        target,
        [
          "prototyping:",
          "  recommended_mode: full-harness",
          "  rationale: UI validation required",
          "  allowed_modes:",
          "    - standard",
          "    - full-harness",
          "  surface: mobile",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await parseDiscussionModeRecommendationWithWarnings(target);
      expect(result.recommendation).toEqual({
        recommendedMode: "full-harness",
        rationale: "UI validation required",
        allowedModes: ["full-harness", "standard"],
        surface: "mobile",
        sourceSchema: "canonical-namespaced",
      });
      expect(result.warnings).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects valid namespaced when stale top-level keys coexist (hard invalid)", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "low-cost",
      rationale: "top-level rationale",
      allowed_modes: ["low-cost"],
      surface: "web",
      prototyping: {
        recommended_mode: "standard",
        rationale: "namespaced rationale",
        allowed_modes: ["standard"],
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

  it("returns null for legacy top-level only (no prototyping key)", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "legacy",
      allowed_modes: ["standard"],
      surface: "web",
    });
    expect(result.recommendation).toBeNull();
  });

  it("returns null when schema is invalid", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "invalid-mode",
    });
    expect(result.recommendation).toBeNull();
  });

  it("returns null when allowed_modes is missing (strict)", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "missing allowed_modes",
        surface: "web",
      },
    });
    expect(result.recommendation).toBeNull();
  });

  it("returns null when surface is missing (strict)", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "missing surface",
        allowed_modes: ["standard"],
      },
    });
    expect(result.recommendation).toBeNull();
  });

  it("invalid namespaced + stale top-level keys -> recommendation null (stale keys cause hard invalid)", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: {
        recommended_mode: "invalid-mode",
        rationale: "bad namespaced",
        allowed_modes: ["standard"],
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

  it("valid namespaced only -> recommendation returned", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "namespaced only",
        allowed_modes: ["standard"],
        surface: "web",
      },
    });
    expect(result.recommendation?.recommendedMode).toBe("standard");
    expect(result.recommendation?.sourceSchema).toBe("canonical-namespaced");
    expect(result.warnings).toEqual([]);
  });

  it("valid namespaced + stale top-level keys -> recommendation is null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "invalid-mode",
      rationale: "stale legacy block",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: {
        recommended_mode: "standard",
        rationale: "canonical block",
        allowed_modes: ["standard"],
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

  it("stale top-level keys alone -> recommendation is null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "stale only",
      allowed_modes: ["standard"],
      surface: "web",
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Legacy top-level recommendation keys are not supported"),
      ]),
    );
  });

  it("invalid namespaced + stale legacy keys -> recommendation is null (stale coexist hard invalid)", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: {
        recommended_mode: "bad-mode",
        rationale: "invalid namespaced",
        allowed_modes: ["standard"],
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

  it("scalar namespaced -> recommendation null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: "invalid",
    });
    expect(result.recommendation).toBeNull();
  });

  it("array namespaced -> recommendation null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: ["item1", "item2"],
    });
    expect(result.recommendation).toBeNull();
  });

  it("null namespaced -> recommendation null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: null,
    });
    expect(result.recommendation).toBeNull();
  });

  it("boolean namespaced -> recommendation null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web",
      prototyping: true,
    });
    expect(result.recommendation).toBeNull();
  });

  it("namespaced absent + legacy only -> returns null (legacy not supported)", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "low-cost",
      rationale: "legacy only",
      allowed_modes: ["low-cost"],
      surface: "non-ui",
    });
    expect(result.recommendation).toBeNull();
  });

  it("returns null with QFAI-PROT-154 warning when recommended_mode is not in allowed_modes (semantic mismatch)", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "semantic mismatch test",
        allowed_modes: ["low-cost", "full-harness"],
        surface: "web",
      },
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-154")]),
    );
  });

  it("returns valid recommendation when recommended_mode is in allowed_modes", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "semantic valid test",
        allowed_modes: ["low-cost", "standard", "full-harness"],
        surface: "web",
      },
    });
    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation?.recommendedMode).toBe("standard");
    expect(result.warnings).toEqual([]);
  });
});

describe("obligation matrix (shared)", () => {
  it("ui-bearing + full-harness requires all bundles", () => {
    const o = derivePrototypingObligations({ surface: "web", effectiveMode: "full-harness" });
    expect(o.requireRuntimeGate).toBe(true);
    expect(o.requireUiFidelity).toBe(true);
    expect(o.requireRenderBundle).toBe(true);
    expect(o.requireBrowserQaBundle).toBe(true);
    expect(o.requireFullHarness).toBe(true);
  });

  it("ui-bearing + standard requires uiFidelity only", () => {
    const o = derivePrototypingObligations({ surface: "web", effectiveMode: "standard" });
    expect(o.requireUiFidelity).toBe(true);
    expect(o.requireRuntimeGate).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
    expect(o.requireFullHarness).toBe(false);
  });

  it("cli + standard requires nothing", () => {
    const o = derivePrototypingObligations({ surface: "cli", effectiveMode: "standard" });
    expect(o.validCombination).toBe(false);
    expect(o.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
  });

  it("cli + full-harness is invalid", () => {
    const o = derivePrototypingObligations({ surface: "cli", effectiveMode: "full-harness" });
    expect(o.validCombination).toBe(false);
    expect(o.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
  });

  it("ui-bearing + low-cost requires nothing", () => {
    const o = derivePrototypingObligations({ surface: "web", effectiveMode: "low-cost" });
    expect(o.requireUiFidelity).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
    expect(o.requireFullHarness).toBe(false);
  });

  it("TC-A6: cli + standard → no UI obligations", () => {
    const o = derivePrototypingObligations({ surface: "cli", effectiveMode: "standard" });
    expect(o.validCombination).toBe(false);
    expect(o.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
  });

  it("TC-A7: cli + full-harness → invalid combination", () => {
    const o = derivePrototypingObligations({ surface: "cli", effectiveMode: "full-harness" });
    expect(o.validCombination).toBe(false);
    expect(o.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
  });
});

describe("surface inference (shared)", () => {
  it("uses evidence surface when valid", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        evidenceSurface: "mobile",
        recommendationSurface: "web",
      }),
    ).toBe("mobile");
  });

  it("falls back to recommendation surface", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        recommendationSurface: "desktop",
      }),
    ).toBe("desktop");
  });

  it("returns null when no canonical surface can be inferred", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        hasUiFidelity: true,
      }),
    ).toBeNull();
  });

  it("returns null when no signals are present", () => {
    expect(inferSurfaceFromRecommendationAndEvidence({})).toBeNull();
  });
});
