/**
 * A sunset that is only written down is not a sunset.
 *
 * Three deprecations named 1.10.0 in their user-facing text while their code
 * did nothing at that version: `playwright-cli` was documented as "at sunset
 * only `playwright` is accepted" and accepted unconditionally, the
 * `D-DEPRECATED-PROBE` doctor check hard-coded `warning`, and `QFAI-AUD-001`
 * hard-coded `info`. Shipping 1.10.0 would have made all three notices false.
 *
 * These tests exercise the comparator. Binding a declaration to its ENFORCEMENT
 * is a different check and lives in `sunsetLedger.test.ts` — see the scope note
 * on the last case here for why this file cannot do it.
 */
import { describe, expect, it } from "vitest";

import {
  SUNSETS,
  deprecationSeverity,
  isAtOrPastSunset,
  newRuleSeverity,
} from "../../src/core/sunset.js";

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

describe("newRuleSeverity", () => {
  // The promotion window is the sunset run backwards: a new code has to be
  // survivable for a repository whose data predates it, so it ships at
  // `warning` and hardens at the pinned release.
  it("is warning before the promotion release and error from it", () => {
    expect(newRuleSeverity("1.11.9", "1.12.0")).toBe("warning");
    expect(newRuleSeverity("1.12.0", "1.12.0")).toBe("error");
    expect(newRuleSeverity("2.0.0", "1.12.0")).toBe("error");
  });

  it("keeps an unreadable version inside the window", () => {
    // `resolveToolVersion` answers "unknown" when it cannot read package.json.
    expect(newRuleSeverity("unknown", "1.12.0")).toBe("warning");
  });
});

describe("the shipped package is past every sunset it declares", () => {
  it.each(Object.entries(SUNSETS))(
    "%s is enforced at the running version, not merely documented",
    async (_name, sunset) => {
      const { version } = await import("../../package.json", { with: { type: "json" } }).then(
        (m) => m.default as { version: string },
      );
      // Honest scope note: this is a smoke check over the comparator, NOT the
      // regression guard the file header once claimed. The assertion below is a
      // tautology — `deprecationSeverity` is defined as
      // `isAtOrPastSunset(...) ? "error" : "warning"` — and iterating existing
      // keys cannot see the failure mode that actually occurred five times in
      // this release: a key, or a whole deprecation, that no call site reads.
      //
      // `tests/core/sunsetLedger.test.ts` is the guard for that. It asserts
      // every `SUNSETS` key has a consumer outside `sunset.ts`, that every
      // finding code named by a sunset-bearing constraint row is emitted
      // somewhere in `src/`, and that no file parses a version next to a sunset
      // instead of calling this comparator.
      expect(typeof deprecationSeverity(version, sunset)).toBe("string");
      expect(isAtOrPastSunset(version, sunset)).toBe(
        deprecationSeverity(version, sunset) === "error",
      );
    },
  );
});
