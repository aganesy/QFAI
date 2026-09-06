import { describe, expect, it } from "vitest";
import {
  resolveDeclaredTcId,
  resolveParentTcId,
  splitTcRefs,
  isCoverageTargetLevel,
} from "../../src/core/tddHelpers.js";

describe("resolveParentTcId", () => {
  it("resolves sub-ID to parent", () => {
    expect(resolveParentTcId("TC-0001-0001")).toBe("TC-0001");
  });

  it("resolves deeper sub-ID by stripping last segment only", () => {
    expect(resolveParentTcId("TC-0001-0002-0003")).toBe("TC-0001-0002");
  });

  it("returns undefined for parent-level ID", () => {
    expect(resolveParentTcId("TC-0001")).toBeUndefined();
  });

  it("returns undefined for bare prefix without numeric segments", () => {
    expect(resolveParentTcId("TC")).toBeUndefined();
  });

  it("is case-insensitive for TC prefix", () => {
    expect(resolveParentTcId("tc-0001-0002")).toBe("tc-0001");
  });
});

describe("resolveDeclaredTcId", () => {
  const declared = new Set(["TC-0001", "TC-0002-0003"]);

  it("returns the token when the spec declares it", () => {
    expect(resolveDeclaredTcId("TC-0001", declared)).toBe("TC-0001");
  });

  it("resolves a decomposition sub-ID to the declared parent", () => {
    // The whole point: a ledger cites the parts, the spec declares the parent.
    expect(resolveDeclaredTcId("TC-0001-0004", declared)).toBe("TC-0001");
  });

  it("prefers the token's own declaration over its parent's", () => {
    // `TC-0002-0003` is declared in its own right, so it speaks for itself
    // even though stripping a segment would also land on something.
    expect(resolveDeclaredTcId("TC-0002-0003", declared)).toBe("TC-0002-0003");
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(resolveDeclaredTcId(" tc-0001-0004 ", declared)).toBe("TC-0001");
  });

  it("returns undefined when neither the token nor its parent is declared", () => {
    expect(resolveDeclaredTcId("TC-0009-0001", declared)).toBeUndefined();
  });

  it("returns undefined for an over-long reference", () => {
    // `resolveParentTcId` strips one segment, so without the shape gate this
    // typo would speak for the real `TC-0002-0003`.
    expect(resolveDeclaredTcId("TC-0002-0003-0005", declared)).toBeUndefined();
  });

  it("returns undefined for a token that is not a TC reference", () => {
    expect(resolveDeclaredTcId("US-0001", declared)).toBeUndefined();
  });
});

describe("splitTcRefs", () => {
  it("splits comma-separated refs", () => {
    expect(splitTcRefs("TC-0001, TC-0002")).toEqual(["TC-0001", "TC-0002"]);
  });

  it("splits semicolon-separated refs", () => {
    expect(splitTcRefs("TC-0001;TC-0002")).toEqual(["TC-0001", "TC-0002"]);
  });

  it("splits whitespace-separated refs", () => {
    expect(splitTcRefs("TC-0001 TC-0002")).toEqual(["TC-0001", "TC-0002"]);
  });

  it("returns empty array for blank input", () => {
    expect(splitTcRefs("  ")).toEqual([]);
  });
});

describe("isCoverageTargetLevel", () => {
  it("includes unit", () => {
    expect(isCoverageTargetLevel("unit")).toBe(true);
  });

  it("includes component", () => {
    expect(isCoverageTargetLevel("component")).toBe(true);
  });

  it("excludes integration", () => {
    expect(isCoverageTargetLevel("integration")).toBe(false);
  });

  it("excludes e2e", () => {
    expect(isCoverageTargetLevel("e2e")).toBe(false);
  });

  it("excludes system", () => {
    expect(isCoverageTargetLevel("system")).toBe(false);
  });

  it("excludes acceptance", () => {
    expect(isCoverageTargetLevel("acceptance")).toBe(false);
  });

  it("recognizes the L1/L2 codes the 06_Test-Cases.md template ships", () => {
    expect(isCoverageTargetLevel("L1")).toBe(true);
    expect(isCoverageTargetLevel("L2")).toBe(true);
  });

  it("excludes L3-L5, which the template maps to non-unit layers", () => {
    expect(isCoverageTargetLevel("L3")).toBe(false);
    expect(isCoverageTargetLevel("L4")).toBe(false);
    expect(isCoverageTargetLevel("L5")).toBe(false);
  });

  it("excludes api", () => {
    expect(isCoverageTargetLevel("api")).toBe(false);
  });

  it("excludes the ATDD-routed spellings so --profile full agrees with the TC routing", () => {
    // A `Level: L4` TC carrying its correct tests/api/** annotation must not
    // also be demanded as a TDD obligation (TDDLIST_TC_NOT_COVERED).
    for (const level of ["L3", "L4", "L5", "api"]) {
      expect(isCoverageTargetLevel(level)).toBe(false);
    }
  });

  it("excludes the word spelling the crosswalk pairs with each of L3-L5", () => {
    // The crosswalk's other column: `tdd/test-list.md#Layer` writes the word,
    // and both spellings must classify identically or the same layer is a
    // coverage target in one artifact and not the other.
    for (const level of ["integration", "api", "e2e"]) {
      expect(isCoverageTargetLevel(level)).toBe(false);
    }
  });

  it("still conservatively includes a genuinely unrecognized value", () => {
    expect(isCoverageTargetLevel("smoke")).toBe(true);
  });

  it("excludes an undeclared Level, which QFAI-ATDD-112 owns", () => {
    // Not the conservative reading of an unreadable cell — there is no cell to
    // read. `resolveAtddHomeKind(undefined)` already routes such a TC to
    // `tests/integration/**` at `error`, so claiming it here as well gave one
    // TC two gates, two owners and two evidence files.
    expect(isCoverageTargetLevel("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isCoverageTargetLevel("E2E")).toBe(false);
    expect(isCoverageTargetLevel("Unit")).toBe(true);
  });
});
