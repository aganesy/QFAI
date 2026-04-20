/**
 * Surface type unit tests — WS-A canonical CLI semantics
 *
 * Validates that discussion UI-bearing and visual/browser obligation sets
 * follow canonical rules.
 */
import { describe, expect, it } from "vitest";

import {
  DISCUSSION_NON_UI_SURFACES,
  DISCUSSION_UI_BEARING_SURFACES,
  VISUAL_BROWSER_SURFACES,
  isDiscussionUiBearingSurfaceType,
  requiresVisualBrowserEvidence,
  type SurfaceType,
} from "../../src/core/detection/surfaceType.js";

describe("discussion surface sets", () => {
  it("web is UI-bearing", () => {
    expect(DISCUSSION_UI_BEARING_SURFACES.has("web")).toBe(true);
  });

  it("mobile is UI-bearing", () => {
    expect(DISCUSSION_UI_BEARING_SURFACES.has("mobile")).toBe(true);
  });

  it("desktop is UI-bearing", () => {
    expect(DISCUSSION_UI_BEARING_SURFACES.has("desktop")).toBe(true);
  });

  it("mixed is UI-bearing", () => {
    expect(DISCUSSION_UI_BEARING_SURFACES.has("mixed")).toBe(true);
  });

  it("cli is discussion UI-bearing", () => {
    expect(DISCUSSION_UI_BEARING_SURFACES.has("cli")).toBe(true);
    expect(DISCUSSION_NON_UI_SURFACES.has("cli")).toBe(false);
  });

  it("non-ui is NON-UI", () => {
    expect(DISCUSSION_NON_UI_SURFACES.has("non-ui")).toBe(true);
    expect(DISCUSSION_UI_BEARING_SURFACES.has("non-ui")).toBe(false);
  });

  it("sets are mutually exclusive and cover all SurfaceType values", () => {
    const allSurfaces: SurfaceType[] = ["web", "mobile", "desktop", "cli", "mixed", "non-ui"];
    for (const s of allSurfaces) {
      const inUi = DISCUSSION_UI_BEARING_SURFACES.has(s);
      const inNonUi = DISCUSSION_NON_UI_SURFACES.has(s);
      expect(inUi || inNonUi).toBe(true);
      expect(inUi && inNonUi).toBe(false);
    }
  });
});

describe("isDiscussionUiBearingSurfaceType", () => {
  it("returns true for web", () => {
    expect(isDiscussionUiBearingSurfaceType("web")).toBe(true);
  });

  it("returns true for mobile", () => {
    expect(isDiscussionUiBearingSurfaceType("mobile")).toBe(true);
  });

  it("returns true for desktop", () => {
    expect(isDiscussionUiBearingSurfaceType("desktop")).toBe(true);
  });

  it("returns true for mixed", () => {
    expect(isDiscussionUiBearingSurfaceType("mixed")).toBe(true);
  });

  it("returns true for cli", () => {
    expect(isDiscussionUiBearingSurfaceType("cli")).toBe(true);
  });

  it("returns false for non-ui", () => {
    expect(isDiscussionUiBearingSurfaceType("non-ui")).toBe(false);
  });
});

describe("requiresVisualBrowserEvidence", () => {
  it("returns true for browser surfaces", () => {
    expect(VISUAL_BROWSER_SURFACES.has("web")).toBe(true);
    expect(requiresVisualBrowserEvidence("web")).toBe(true);
    expect(requiresVisualBrowserEvidence("mobile")).toBe(true);
    expect(requiresVisualBrowserEvidence("desktop")).toBe(true);
    expect(requiresVisualBrowserEvidence("mixed")).toBe(true);
  });

  it("returns false for cli and non-ui", () => {
    expect(VISUAL_BROWSER_SURFACES.has("cli")).toBe(false);
    expect(requiresVisualBrowserEvidence("cli")).toBe(false);
    expect(requiresVisualBrowserEvidence("non-ui")).toBe(false);
  });
});
