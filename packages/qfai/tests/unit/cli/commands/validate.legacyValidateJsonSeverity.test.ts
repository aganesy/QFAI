/**
 * Unit test — `legacyValidateJsonSeverity` prerelease-aware semver
 * comparison.
 *
 * Regression guard: prior implementation parsed only `major.minor`,
 * which treated `1.10.0-beta.1` (release candidate of the sunset
 * version) as already past sunset and disabled the legacy write
 * before GA. The replacement walks `major.minor.patch` and applies
 * the semver §11 rule that a prerelease at the sunset triple is
 * still pre-sunset (warning mode), while a clean release at the same
 * triple is at-sunset (error mode).
 *
 * The sunset literal `1.10.0` is hard-coded in
 * `legacyValidateJsonSeverity` via `LEGACY_VALIDATE_JSON_SUNSET`; the
 * cases below assume that pin.
 */

import { describe, expect, it } from "vitest";

import { legacyValidateJsonSeverity } from "../../../../src/cli/commands/validate.js";

describe("legacyValidateJsonSeverity — sunset = 1.10.0", () => {
  it("1.9.5 (pre-sunset minor) → warning, legacy write enabled", () => {
    expect(legacyValidateJsonSeverity("1.9.5")).toBe("warning");
  });

  it("1.10.0-beta.1 (prerelease at sunset triple) → warning (still in RC window)", () => {
    expect(legacyValidateJsonSeverity("1.10.0-beta.1")).toBe("warning");
  });

  it("1.10.0 (clean GA at sunset triple) → error", () => {
    expect(legacyValidateJsonSeverity("1.10.0")).toBe("error");
  });

  it("1.10.0-rc.5 (RC at sunset triple) → warning (RC still in window)", () => {
    expect(legacyValidateJsonSeverity("1.10.0-rc.5")).toBe("warning");
  });

  it("1.10.1 (patch past sunset) → error", () => {
    expect(legacyValidateJsonSeverity("1.10.1")).toBe("error");
  });

  it("2.0.0-alpha.1 (next major prerelease) → error (past sunset major)", () => {
    expect(legacyValidateJsonSeverity("2.0.0-alpha.1")).toBe("error");
  });

  // Conservative fallbacks: unparseable inputs default to warning so a
  // version-resolution failure does not silently disable the legacy
  // write before the announced sunset.
  it("unparseable current version → warning (conservative default)", () => {
    expect(legacyValidateJsonSeverity("not-a-version")).toBe("warning");
  });

  it("major-only version → warning (conservative default — missing patch)", () => {
    expect(legacyValidateJsonSeverity("1.10")).toBe("warning");
  });
});
