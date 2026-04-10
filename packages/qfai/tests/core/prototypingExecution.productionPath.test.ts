/**
 * WS-E: Prototyping execution production path tests
 *
 * Verifies the execution pipeline and obligation matrix follow the
 * full-harness-only / UI-only contract.
 */

import { describe, expect, it } from "vitest";

import { derivePrototypingObligations } from "../../src/core/prototyping/mode.js";
import { buildRuntimeGate } from "../../src/core/prototyping/runtimeGateBuilder.js";
import { buildRuntimeObservation } from "../../src/core/prototyping/runtimeObservation.js";
import {
  assertSupportedPrototypingSurface,
  isSupportedPrototypingSurface,
} from "../../src/core/prototyping/surfacePolicy.js";
import type { PrototypingSurface } from "../../src/core/prototyping/types.js";

describe("prototyping execution production path", () => {
  it("requires every evidence bundle for supported UI surfaces", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "full-harness",
    });
    expect(obligations).toMatchObject({
      requireUiFidelity: true,
      requireRenderBundle: true,
      requireBrowserQaBundle: true,
      requireFullHarness: true,
      requireRuntimeGate: true,
      validCombination: true,
    });
  });

  it("rejects non-full-harness modes", () => {
    const obligations = derivePrototypingObligations({
      surface: "web",
      effectiveMode: "standard",
    });
    expect(obligations.validCombination).toBe(false);
  });

  it("rejects cli surface even when full-harness is requested", () => {
    expect(isSupportedPrototypingSurface("cli")).toBe(false);
    expect(() => assertSupportedPrototypingSurface("cli")).toThrow("UI-bearing surfaces");
  });

  it("treats web/mobile/desktop/mixed as supported prototyping surfaces", () => {
    const supported: PrototypingSurface[] = ["web", "mobile", "desktop", "mixed"];
    for (const surface of supported) {
      expect(isSupportedPrototypingSurface(surface)).toBe(true);
    }
  });

  it("builds runtime gate only from observed canonical routes", () => {
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
    expect(gate?.ui).toHaveLength(1);
    expect(gate?.ui[0]?.route).toBe("/dashboard");
    expect(gate?.ui[0]?.url).toBe("http://localhost:3000/dashboard");
    expect(gate?.ui[0]?.rendered).toBe(true);
  });

  it("keeps runtime gate undefined when there is no observed UI route", () => {
    const gate = buildRuntimeGate({ runtimeObservation: { ui: [] } });
    expect(gate).toBeUndefined();
  });
});
