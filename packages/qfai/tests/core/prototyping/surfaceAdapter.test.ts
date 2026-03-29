// QFAI:SPEC-0006:TC-0006-0036
// QFAI:SPEC-0006:TC-0006-0037
// QFAI:SPEC-0006:TC-0006-0038
import { describe, expect, it } from "vitest";

import {
  adaptSurfaceEvidence,
  type SurfaceType,
  type SurfaceEvidenceResult,
} from "../../../src/core/prototyping/surfaceAdapter.js";

describe("adaptSurfaceEvidence", () => {
  describe("TC-0006-0036: non-visual surface standard mode", () => {
    it("sets visual-review fields to n/a for CLI surface in standard mode", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "cli",
        effectiveMode: "standard",
      });

      expect(result.visual_review).toBe("n/a");
      expect(result.static_evidence).toBe("collected");
      expect(result.runtime_evidence).toBe("collected");
    });

    it("sets visual-review fields to n/a for API surface in standard mode", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "api",
        effectiveMode: "standard",
      });

      expect(result.visual_review).toBe("n/a");
      expect(result.static_evidence).toBe("collected");
    });

    it("sets visual-review fields to n/a for library surface in standard mode", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "library",
        effectiveMode: "standard",
      });

      expect(result.visual_review).toBe("n/a");
    });
  });

  describe("TC-0006-0037: non-visual surface low-cost mode", () => {
    it("sets visual-review to n/a for CLI in low-cost mode, no browser failure", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "cli",
        effectiveMode: "low-cost",
      });

      expect(result.visual_review).toBe("n/a");
      expect(result.static_evidence).toBe("collected");
      expect(result.runtime_evidence).toBe("n/a");
    });

    it("sets visual-review to n/a for API-only library in low-cost mode", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "api",
        effectiveMode: "low-cost",
      });

      expect(result.visual_review).toBe("n/a");
      expect(result.static_evidence).toBe("collected");
      expect(result.runtime_evidence).toBe("n/a");
    });
  });

  describe("TC-0006-0038: non-visual to visual surface transition", () => {
    it("returns n/a for non-visual surface, populated for visual surface", () => {
      const nonVisual = adaptSurfaceEvidence({
        surfaceType: "cli",
        effectiveMode: "standard",
      });
      expect(nonVisual.visual_review).toBe("n/a");

      const visual = adaptSurfaceEvidence({
        surfaceType: "web",
        effectiveMode: "standard",
      });
      expect(visual.visual_review).toBe("collected");
      expect(visual.static_evidence).toBe("collected");
      expect(visual.runtime_evidence).toBe("collected");
    });

    it("web surface in low-cost mode still collects visual-review as n/a (no runtime)", () => {
      const result = adaptSurfaceEvidence({
        surfaceType: "web",
        effectiveMode: "low-cost",
      });

      // low-cost mode: static only, no runtime including visual
      expect(result.static_evidence).toBe("collected");
      expect(result.runtime_evidence).toBe("n/a");
      expect(result.visual_review).toBe("n/a");
    });
  });

  describe("surface type classification", () => {
    it("classifies web as visual", () => {
      const result = adaptSurfaceEvidence({ surfaceType: "web", effectiveMode: "standard" });
      expect(result.visual_review).toBe("collected");
    });

    it("classifies mobile as visual", () => {
      const result = adaptSurfaceEvidence({ surfaceType: "mobile", effectiveMode: "standard" });
      expect(result.visual_review).toBe("collected");
    });

    it("classifies desktop as visual", () => {
      const result = adaptSurfaceEvidence({ surfaceType: "desktop", effectiveMode: "standard" });
      expect(result.visual_review).toBe("collected");
    });
  });
});
