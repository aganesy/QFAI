import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  derivePrototypingObligations,
  inferSurfaceFromRecommendationAndEvidence,
  isUiBearingSurface,
  normalizeAllowedModes,
  parseDiscussionFromObject,
  parseDiscussionModeRecommendation,
  parseDiscussionModeRecommendationWithWarnings,
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
        surface: "web-ui",
      },
    });

    expect(summary.effective).toBe("standard");
    expect(summary.source).toBe("discussion-recommendation");
    expect(summary.discussionRecommendation?.surface).toBe("web-ui");
    expect(summary.surface).toBe("web-ui");
  });

  it("falls back to standard default", () => {
    const result = resolvePrototypingMode({});
    expect(result.effective).toBe("standard");
    expect(result.source).toBe("default");
  });

  it("normalizes allowed modes by de-duplicating valid entries", () => {
    expect(normalizeAllowedModes(["standard", "full-harness", "standard", "invalid"])).toEqual([
      "full-harness",
      "standard",
    ]);
  });

  it("detects ui-bearing surfaces", () => {
    expect(isUiBearingSurface("web-ui")).toBe(true);
    expect(isUiBearingSurface("mixed")).toBe(true);
    expect(isUiBearingSurface("non-ui")).toBe(false);
  });

  it("recommendation overrides default", () => {
    const result = resolvePrototypingMode({
      discussionRecommendation: {
        recommendedMode: "low-cost",
        rationale: "early prototype",
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
      },
    });
    expect(summary.effective).toBe("full-harness");
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("QFAI-PROT-236"),
      ]),
    );
  });

  it("warns when recommendation uses legacy schema", () => {
    const summary = summarizeResolvedMode({
      discussionRecommendation: {
        recommendedMode: "standard",
        rationale: "default",
        sourceSchema: "legacy-top-level",
      },
    });
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("QFAI-PROT-231"),
      ]),
    );
  });
});

describe("dual-schema parser", () => {
  it("parses legacy top-level yaml", async () => {
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
          "surface: web-ui",
          "updated_at: 2026-04-04T00:00:00Z",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(parseDiscussionModeRecommendation(target)).resolves.toEqual({
        recommendedMode: "standard",
        rationale: "customer presentable",
        allowedModes: ["low-cost", "standard"],
        surface: "web-ui",
        updatedAt: "2026-04-04T00:00:00Z",
        sourceSchema: "legacy-top-level",
      });
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
          "  surface: mobile-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await parseDiscussionModeRecommendationWithWarnings(target);
      expect(result.recommendation).toEqual({
        recommendedMode: "full-harness",
        rationale: "UI validation required",
        allowedModes: ["full-harness", "standard"],
        surface: "mobile-ui",
        sourceSchema: "canonical-namespaced",
      });
      expect(result.warnings).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prefers namespaced when both schemas are present", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "low-cost",
      rationale: "top-level rationale",
      allowed_modes: ["low-cost"],
      surface: "web-ui",
      prototyping: {
        recommended_mode: "standard",
        rationale: "namespaced rationale",
        allowed_modes: ["standard"],
        surface: "web-ui",
      },
    });
    expect(result.recommendation?.recommendedMode).toBe("standard");
    expect(result.recommendation?.sourceSchema).toBe("canonical-namespaced");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("QFAI-PROT-232"),
      ]),
    );
  });

  it("emits deprecation warning for legacy top-level", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
    });
    expect(result.recommendation?.sourceSchema).toBe("legacy-top-level");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("QFAI-PROT-231"),
      ]),
    );
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
        surface: "web-ui",
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

  // W2: existence-based precedence regression tests
  it("invalid namespaced + valid legacy does NOT fall back to legacy", () => {
    const result = parseDiscussionFromObject({
      // valid legacy
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      // invalid namespaced (bad recommended_mode)
      prototyping: {
        recommended_mode: "invalid-mode",
        rationale: "bad namespaced",
        allowed_modes: ["standard"],
        surface: "web-ui",
      },
    });
    // Should NOT fall back to legacy — namespaced exists, so it takes precedence
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("valid namespaced only -> namespaced adopted", () => {
    const result = parseDiscussionFromObject({
      prototyping: {
        recommended_mode: "standard",
        rationale: "namespaced only",
        allowed_modes: ["standard"],
        surface: "web-ui",
      },
    });
    expect(result.recommendation?.recommendedMode).toBe("standard");
    expect(result.recommendation?.sourceSchema).toBe("canonical-namespaced");
    expect(result.warnings).toEqual([]);
  });

  it("valid namespaced + invalid legacy keys -> QFAI-PROT-232 warning with namespaced adopted", () => {
    const result = parseDiscussionFromObject({
      // invalid legacy keys (invalid recommended_mode)
      recommended_mode: "invalid-mode",
      rationale: "stale legacy block",
      allowed_modes: ["standard"],
      surface: "web-ui",
      // valid namespaced block
      prototyping: {
        recommended_mode: "standard",
        rationale: "canonical block",
        allowed_modes: ["standard"],
        surface: "web-ui",
      },
    });
    // Namespaced is adopted
    expect(result.recommendation?.recommendedMode).toBe("standard");
    expect(result.recommendation?.sourceSchema).toBe("canonical-namespaced");
    // Coexistence warning fires on key existence
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("invalid namespaced + valid legacy -> does NOT fall back, recommendation is null", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      prototyping: {
        recommended_mode: "bad-mode",
        rationale: "invalid namespaced",
        allowed_modes: ["standard"],
        surface: "web-ui",
      },
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  // W-4.9: non-object namespaced precedence — recommendation must be null, no legacy fallback
  it("scalar namespaced + valid legacy -> recommendation null, no legacy fallback", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      prototyping: "invalid",
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("array namespaced + valid legacy -> recommendation null, no legacy fallback", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      prototyping: ["item1", "item2"],
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("null namespaced + valid legacy -> recommendation null, no legacy fallback", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      prototyping: null,
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("boolean namespaced + valid legacy -> recommendation null, no legacy fallback", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "standard",
      rationale: "valid legacy",
      allowed_modes: ["standard"],
      surface: "web-ui",
      prototyping: true,
    });
    expect(result.recommendation).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-232")]),
    );
  });

  it("namespaced absent + valid legacy -> legacy adopted", () => {
    const result = parseDiscussionFromObject({
      recommended_mode: "low-cost",
      rationale: "legacy only",
      allowed_modes: ["low-cost"],
      surface: "non-ui",
    });
    expect(result.recommendation?.recommendedMode).toBe("low-cost");
    expect(result.recommendation?.sourceSchema).toBe("legacy-top-level");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("QFAI-PROT-231")]),
    );
  });
});

describe("obligation matrix (shared)", () => {
  it("ui-bearing + full-harness requires all bundles", () => {
    const o = derivePrototypingObligations({ surface: "web-ui", effectiveMode: "full-harness" });
    expect(o.requireRuntimeGate).toBe(true);
    expect(o.requireUiFidelity).toBe(true);
    expect(o.requireRenderBundle).toBe(true);
    expect(o.requireBrowserQaBundle).toBe(true);
    expect(o.requireFullHarness).toBe(true);
  });

  it("ui-bearing + standard requires uiFidelity only", () => {
    const o = derivePrototypingObligations({ surface: "web-ui", effectiveMode: "standard" });
    expect(o.requireUiFidelity).toBe(true);
    expect(o.requireRuntimeGate).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
    expect(o.requireFullHarness).toBe(false);
  });

  it("non-ui + standard requires nothing", () => {
    const o = derivePrototypingObligations({ surface: "non-ui", effectiveMode: "standard" });
    expect(o.requireUiFidelity).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
    expect(o.requireFullHarness).toBe(false);
  });

  it("non-ui + full-harness requires fullHarness only", () => {
    const o = derivePrototypingObligations({ surface: "non-ui", effectiveMode: "full-harness" });
    expect(o.requireFullHarness).toBe(true);
    expect(o.requireUiFidelity).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
  });

  it("ui-bearing + low-cost requires nothing", () => {
    const o = derivePrototypingObligations({ surface: "web-ui", effectiveMode: "low-cost" });
    expect(o.requireUiFidelity).toBe(false);
    expect(o.requireRenderBundle).toBe(false);
    expect(o.requireBrowserQaBundle).toBe(false);
    expect(o.requireFullHarness).toBe(false);
  });
});

describe("surface inference (shared)", () => {
  it("uses evidence surface when valid", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        evidenceSurface: "mobile-ui",
        recommendationSurface: "web-ui",
      }),
    ).toBe("mobile-ui");
  });

  it("falls back to recommendation surface", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        recommendationSurface: "desktop-ui",
      }),
    ).toBe("desktop-ui");
  });

  it("infers web-ui from UI signals", () => {
    expect(
      inferSurfaceFromRecommendationAndEvidence({
        hasUiFidelity: true,
      }),
    ).toBe("web-ui");
  });

  it("infers non-ui when no signals", () => {
    expect(inferSurfaceFromRecommendationAndEvidence({})).toBe("non-ui");
  });
});
