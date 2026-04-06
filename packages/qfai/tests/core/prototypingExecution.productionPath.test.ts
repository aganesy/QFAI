/**
 * WS-E: Prototyping execution production path tests
 *
 * Verifies the execution pipeline produces truthful evidence
 * for each surface × mode combination.
 */

import { describe, it, expect } from "vitest";
import {
  derivePrototypingObligations,
  requiresVisualBrowserEvidence,
} from "../../src/core/prototyping/mode.js";
import { buildRuntimeGate } from "../../src/core/prototyping/runtimeGateBuilder.js";
import type { PrototypingMode, PrototypingSurface } from "../../src/core/prototyping/types.js";

describe("prototyping execution production path", () => {
  describe("UI-bearing + standard + targetUrl", () => {
    it("derives obligations with uiFidelity required", () => {
      const obligations = derivePrototypingObligations({
        surface: "web",
        effectiveMode: "standard",
      });
      expect(obligations.requireUiFidelity).toBe(true);
      expect(obligations.requireRenderBundle).toBe(false);
      expect(obligations.requireBrowserQaBundle).toBe(false);
      expect(obligations.requireFullHarness).toBe(false);
    });
  });

  describe("UI-bearing + full-harness + targetUrl", () => {
    it("derives all obligations as required", () => {
      const obligations = derivePrototypingObligations({
        surface: "web",
        effectiveMode: "full-harness",
      });
      expect(obligations.requireUiFidelity).toBe(true);
      expect(obligations.requireRenderBundle).toBe(true);
      expect(obligations.requireBrowserQaBundle).toBe(true);
      expect(obligations.requireFullHarness).toBe(true);
      expect(obligations.requireRuntimeGate).toBe(true);
    });
  });

  describe("UI-bearing + full-harness + targetUrl absent", () => {
    it("runtime gate is undefined when targetUrl is absent for UI-bearing", () => {
      const gate = buildRuntimeGate({ surface: "web" });
      expect(gate).toBeUndefined();
    });

    it("runtime gate is populated when targetUrl is present for UI-bearing", () => {
      const gate = buildRuntimeGate({ surface: "web", targetUrl: "http://localhost:3000" });
      expect(gate).toBeDefined();
      if (!gate) throw new Error("gate should be defined");
      expect(gate.ui).toHaveLength(1);
      expect(gate.ui[0].route).toBe("http://localhost:3000");
    });
  });

  describe("cli + standard", () => {
    it("derives obligations with UI-specific evidence not required", () => {
      const obligations = derivePrototypingObligations({
        surface: "cli",
        effectiveMode: "standard",
      });
      expect(obligations.requireUiFidelity).toBe(false);
      expect(obligations.requireRenderBundle).toBe(false);
      expect(obligations.requireBrowserQaBundle).toBe(false);
      expect(obligations.requireFullHarness).toBe(false);
      expect(obligations.requireRuntimeGate).toBe(false);
    });

    it("runtime gate returns empty arrays for cli", () => {
      const gate = buildRuntimeGate({ surface: "cli" });
      expect(gate).toBeDefined();
      if (!gate) throw new Error("gate should be defined");
      expect(gate.ui).toEqual([]);
      expect(gate.api).toEqual([]);
    });

    it("requiresVisualBrowserEvidence returns false for cli prototyping surface", () => {
      expect(requiresVisualBrowserEvidence("cli")).toBe(false);
    });
  });

  describe("cli + full-harness", () => {
    it("requires fullHarness but not UI evidence", () => {
      const obligations = derivePrototypingObligations({
        surface: "cli",
        effectiveMode: "full-harness",
      });
      expect(obligations.requireFullHarness).toBe(true);
      expect(obligations.requireUiFidelity).toBe(false);
      expect(obligations.requireRenderBundle).toBe(false);
      expect(obligations.requireBrowserQaBundle).toBe(false);
    });
  });

  describe("surface detection", () => {
    const uiBearingSurfaces: PrototypingSurface[] = ["web", "mobile", "desktop", "mixed"];
    const nonUiSurfaces: PrototypingSurface[] = ["cli"];

    for (const surface of uiBearingSurfaces) {
      it(`${surface} is UI-bearing`, () => {
        expect(requiresVisualBrowserEvidence(surface)).toBe(true);
      });
    }

    for (const surface of nonUiSurfaces) {
      it(`${surface} is not a visual/browser prototyping surface`, () => {
        expect(requiresVisualBrowserEvidence(surface)).toBe(false);
      });
    }
  });

  describe("obligation matrix completeness", () => {
    const modes: PrototypingMode[] = ["low-cost", "standard", "full-harness"];
    const surfaces: PrototypingSurface[] = ["web", "cli"];

    for (const mode of modes) {
      for (const surface of surfaces) {
        it(`${surface}/${mode} produces valid obligations`, () => {
          const obligations = derivePrototypingObligations({
            surface,
            effectiveMode: mode,
          });
          expect(typeof obligations.requireRuntimeGate).toBe("boolean");
          expect(typeof obligations.requireUiFidelity).toBe("boolean");
          expect(typeof obligations.requireRenderBundle).toBe("boolean");
          expect(typeof obligations.requireBrowserQaBundle).toBe("boolean");
          expect(typeof obligations.requireFullHarness).toBe("boolean");
        });
      }
    }
  });
});
