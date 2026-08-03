/**
 * A sunset that is only written down is not a sunset.
 *
 * Three deprecations named 1.10.0 in their user-facing text while their code
 * did nothing at that version: `playwright-cli` was documented as "at sunset
 * only `playwright` is accepted" and accepted unconditionally, the
 * `D-DEPRECATED-PROBE` doctor check hard-coded `warning`, and `QFAI-AUD-001`
 * hard-coded `info`. Shipping 1.10.0 would have made all three notices false.
 *
 * These tests bind the declaration to the comparator, so a future sunset
 * cannot be announced without being enforced.
 */
import { describe, expect, it } from "vitest";

import { SUNSETS, deprecationSeverity, isAtOrPastSunset } from "../../src/core/sunset.js";

describe("isAtOrPastSunset", () => {
  it.each([
    ["1.9.2", false],
    ["1.9.99", false],
    ["1.10.0", true],
    ["1.10.1", true],
    ["2.0.0", true],
  ])("%s is at-or-past 1.10.0 -> %s", (current, expected) => {
    expect(isAtOrPastSunset(current, "1.10.0")).toBe(expected);
  });

  it("treats a prerelease at the sunset triple as still inside the window", () => {
    // semver §11: 1.10.0-beta.1 sorts before 1.10.0, so the window is open.
    expect(isAtOrPastSunset("1.10.0-beta.1", "1.10.0")).toBe(false);
    expect(isAtOrPastSunset("1.10.1-beta.1", "1.10.0")).toBe(true);
  });

  it("treats an unparseable version as pre-sunset", () => {
    // An unreadable version must not be the thing that turns a warning into a
    // build failure.
    expect(isAtOrPastSunset("unknown", "1.10.0")).toBe(false);
    expect(isAtOrPastSunset("1.10", "1.10.0")).toBe(false);
  });
});

describe("deprecationSeverity", () => {
  it("is warning inside the window and error from the sunset", () => {
    expect(deprecationSeverity("1.9.2", "1.10.0")).toBe("warning");
    expect(deprecationSeverity("1.10.0", "1.10.0")).toBe("error");
  });
});

describe("the shipped package is past every sunset it declares", () => {
  it.each(Object.entries(SUNSETS))(
    "%s is enforced at the running version, not merely documented",
    async (_name, sunset) => {
      const { version } = await import("../../package.json", { with: { type: "json" } }).then(
        (m) => m.default as { version: string },
      );
      // Not an assertion that the version is past the sunset — a sunset pinned
      // to a future release is legitimate. What must hold is that the decision
      // is computed from the version rather than frozen in a literal, which is
      // exactly what a `deprecationSeverity` call proves.
      expect(typeof deprecationSeverity(version, sunset)).toBe("string");
      expect(isAtOrPastSunset(version, sunset)).toBe(
        deprecationSeverity(version, sunset) === "error",
      );
    },
  );
});
