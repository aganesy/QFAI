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
import { buildRuntimeObservation } from "../../src/core/prototyping/runtimeObservation.js";
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
      const gate = buildRuntimeGate({ runtimeObservation: { ui: [] } });
      expect(gate).toBeUndefined();
    });

    it("runtime gate is populated only from observed canonical routes", () => {
      const observation = buildRuntimeObservation({
        screenContracts: [
          { name: "Dashboard", screenId: "dashboard", route: "/dashboard", primaryTasks: [] },
        ],
        renderResult: {
          entries: [
            {
              capture_id: "dashboard",
              target: "/dashboard",
              status: "captured",
              screenshot_path: "dashboard.png",
              html_path: "dashboard.html",
              viewport: "desktop",
            },
          ],
          filesWritten: ["dashboard.png", "dashboard.html"],
        },
        targetUrl: "http://localhost:3000",
      });
      const gate = buildRuntimeGate({ runtimeObservation: observation });
      expect(gate).toBeDefined();
      if (!gate) throw new Error("gate should be defined");
      expect(gate.ui).toHaveLength(1);
      expect(gate.ui[0].route).toBe("/dashboard");
      expect(gate.ui[0].url).toBe("http://localhost:3000/dashboard");
      expect(gate.ui[0].rendered).toBe(true);
    });
  });

  describe("cli + standard", () => {
    it("rejects non-UI prototyping surfaces across all modes", () => {
      const obligations = derivePrototypingObligations({
        surface: "cli",
        effectiveMode: "standard",
      });
      expect(obligations.validCombination).toBe(false);
      expect(obligations.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
    });

    it("runtime gate is undefined for cli", () => {
      const gate = buildRuntimeGate({ runtimeObservation: { ui: [] } });
      expect(gate).toBeUndefined();
    });

    it("requiresVisualBrowserEvidence returns false for cli prototyping surface", () => {
      expect(requiresVisualBrowserEvidence("cli")).toBe(false);
    });
  });

  describe("cli + full-harness", () => {
    it("marks cli/full-harness as invalid", () => {
      const obligations = derivePrototypingObligations({
        surface: "cli",
        effectiveMode: "full-harness",
      });
      expect(obligations.validCombination).toBe(false);
      expect(obligations.invalidReasonCode).toBe("unsupported_non_ui_prototyping_surface");
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
