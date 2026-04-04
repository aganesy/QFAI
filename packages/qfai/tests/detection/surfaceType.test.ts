/**
 * Surface type unit tests — WS-A canonical CLI semantics
 *
 * Validates that the shared UI_BEARING_SURFACES / NON_UI_SURFACES sets
 * and the isUiBearingSurfaceType helper follow canonical rules.
 */
import { describe, expect, it } from "vitest";

import {
  UI_BEARING_SURFACES,
  NON_UI_SURFACES,
  isUiBearingSurfaceType,
  type SurfaceType,
} from "../../src/core/detection/surfaceType.js";

describe("UI_BEARING_SURFACES / NON_UI_SURFACES sets", () => {
  it("web is UI-bearing", () => {
    expect(UI_BEARING_SURFACES.has("web")).toBe(true);
  });

  it("mobile is UI-bearing", () => {
    expect(UI_BEARING_SURFACES.has("mobile")).toBe(true);
  });

  it("desktop is UI-bearing", () => {
    expect(UI_BEARING_SURFACES.has("desktop")).toBe(true);
  });

  it("mixed is UI-bearing", () => {
    expect(UI_BEARING_SURFACES.has("mixed")).toBe(true);
  });

  it("cli is NON-UI", () => {
    expect(NON_UI_SURFACES.has("cli")).toBe(true);
    expect(UI_BEARING_SURFACES.has("cli")).toBe(false);
  });

  it("non-ui is NON-UI", () => {
    expect(NON_UI_SURFACES.has("non-ui")).toBe(true);
    expect(UI_BEARING_SURFACES.has("non-ui")).toBe(false);
  });

  it("sets are mutually exclusive and cover all SurfaceType values", () => {
    const allSurfaces: SurfaceType[] = ["web", "mobile", "desktop", "cli", "mixed", "non-ui"];
    for (const s of allSurfaces) {
      const inUi = UI_BEARING_SURFACES.has(s);
      const inNonUi = NON_UI_SURFACES.has(s);
      expect(inUi || inNonUi).toBe(true);
      expect(inUi && inNonUi).toBe(false);
    }
  });
});

describe("isUiBearingSurfaceType", () => {
  it("returns true for web", () => {
    expect(isUiBearingSurfaceType("web")).toBe(true);
  });

  it("returns true for mobile", () => {
    expect(isUiBearingSurfaceType("mobile")).toBe(true);
  });

  it("returns true for desktop", () => {
    expect(isUiBearingSurfaceType("desktop")).toBe(true);
  });

  it("returns true for mixed", () => {
    expect(isUiBearingSurfaceType("mixed")).toBe(true);
  });

  it("returns false for cli", () => {
    expect(isUiBearingSurfaceType("cli")).toBe(false);
  });

  it("returns false for non-ui", () => {
    expect(isUiBearingSurfaceType("non-ui")).toBe(false);
  });
});
