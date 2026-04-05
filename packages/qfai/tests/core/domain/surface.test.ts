import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROTOTYPING_SURFACES,
  assertCanonicalPrototypingSurface,
  isCanonicalPrototypingSurface,
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
});
