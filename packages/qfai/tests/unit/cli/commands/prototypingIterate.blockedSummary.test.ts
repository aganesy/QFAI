/**
 * Unit test for the `[BLOCKED] exit-64 prevented by:` summary contract
 * (spec-0012 Phase 4 / REQ-0012-0068 / TC-0012-0450).
 *
 * Pure helper test: the [BLOCKED] summary builder MUST emit the literal
 * header `[BLOCKED] exit-64 prevented by:` followed by 3 category lines
 * with offender details. Categories are stable + additive-only.
 */

import { describe, expect, it } from "vitest";

import {
  BLOCKED_CATEGORIES,
  BLOCKED_SUMMARY_HEADER,
  buildBlockedCategoryLines,
  buildBlockedSummary,
} from "../../../../src/core/prototyping/blockedSummary.js";

describe("buildBlockedSummary: literal header + 3 category lines", () => {
  it("emits the literal `[BLOCKED] exit-64 prevented by:` header followed by 3 category lines", () => {
    const text = buildBlockedSummary({
      designMdViolations: [{ kind: "color", found: "#fff" }],
      layoutAntiPatternsDetected: ["lap-001"],
      scores: {
        informationArchitecture: "acceptable",
        navigationFlow: "exceptional",
        usability: "exceptional",
        functionality: "exceptional",
      },
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe(BLOCKED_SUMMARY_HEADER);
    expect(lines[0]).toBe("[BLOCKED] exit-64 prevented by:");
    // 3 category lines: one per BLOCKED_CATEGORIES entry.
    expect(lines.length).toBe(1 + 3);
  });

  it("names the top-3 categories in stable order with offender details", () => {
    const lines = buildBlockedCategoryLines({
      designMdViolations: [
        { kind: "color", found: "#fff" },
        { kind: "color", found: "#000" },
      ],
      layoutAntiPatternsDetected: ["lap-009"],
      scores: {
        informationArchitecture: "weak",
        navigationFlow: "exceptional",
        usability: "exceptional",
        functionality: "exceptional",
      },
    });
    expect(lines.map((l) => l.category)).toEqual([
      "designMdViolations",
      "layoutAntiPatternsDetected",
      "axes-below-exceptional",
    ]);
    // designMdViolations: first offender surfaced as `color=#fff`.
    expect(lines[0]?.text).toContain("color=#fff");
    // layoutAntiPatternsDetected: first offender surfaced as the code.
    expect(lines[1]?.text).toContain("lap-009");
    // axes-below-exceptional: first non-exceptional axis named.
    expect(lines[2]?.text).toContain("informationArchitecture");
    expect(lines[2]?.text).toContain("weak");
  });

  it("emits zero-count category lines when there is no offender (no top: prefix)", () => {
    const lines = buildBlockedCategoryLines({
      designMdViolations: [],
      layoutAntiPatternsDetected: [],
      scores: {
        informationArchitecture: "weak",
        navigationFlow: "weak",
        usability: "exceptional",
        functionality: "exceptional",
      },
    });
    expect(lines[0]?.text).toBe("0 designMdViolations");
    expect(lines[1]?.text).toBe("0 layoutAntiPatternsDetected");
    expect(lines[2]?.count).toBe(2);
  });
});

describe("BLOCKED_CATEGORIES set (additive-only invariant)", () => {
  it("matches the locked 3-element identifier set", () => {
    expect([...BLOCKED_CATEGORIES]).toEqual([
      "designMdViolations",
      "layoutAntiPatternsDetected",
      "axes-below-exceptional",
    ]);
  });
});
