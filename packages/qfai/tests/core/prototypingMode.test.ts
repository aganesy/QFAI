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
        expect.stringContaining("QFAI-PROT-243"),
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
      prototyping: {
        recommended_mode: "standard",
        rationale: "namespaced rationale",
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
