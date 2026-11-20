import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROTOTYPING_SURFACES,
  assertCanonicalPrototypingSurface,
  isCanonicalPrototypingSurface,
  isDiscussionUiBearingPrototypingSurface,
  requiresVisualBrowserEvidenceSurface,
} from "../../../src/core/domain/surface.js";

describe("canonical prototyping surfaces", () => {
  it("accepts the canonical five values", () => {
    expect(CANONICAL_PROTOTYPING_SURFACES).toEqual(["web", "mobile", "desktop", "cli", "mixed"]);
    for (const surface of CANONICAL_PROTOTYPING_SURFACES) {
      expect(isCanonicalPrototypingSurface(surface)).toBe(true);
      expect(assertCanonicalPrototypingSurface(surface)).toBe(surface);
    }
  });

  it("rejects prohibited legacy values without normalization", () => {
    for (const surface of ["web-ui", "mobile-ui", "desktop-ui", "non-ui"]) {
      expect(isCanonicalPrototypingSurface(surface)).toBe(false);
      expect(() => assertCanonicalPrototypingSurface(surface)).toThrow();
    }
  });

  it("treats every canonical surface as discussion UI-bearing", () => {
    const uiBearing = CANONICAL_PROTOTYPING_SURFACES.filter((surface) =>
      isDiscussionUiBearingPrototypingSurface(surface),
    );
    expect(uiBearing).toEqual([...CANONICAL_PROTOTYPING_SURFACES]);
  });

  it("requires visual/browser evidence for every canonical surface except cli", () => {
    const visual = CANONICAL_PROTOTYPING_SURFACES.filter((surface) =>
      requiresVisualBrowserEvidenceSurface(surface),
    );
    expect(visual).toEqual(["web", "mobile", "desktop", "mixed"]);
  });
});
