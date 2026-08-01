import { describe, expect, it } from "vitest";
import {
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

  it("includes the code spelling of the unit and component layers", () => {
    expect(isCoverageTargetLevel("L1")).toBe(true);
    expect(isCoverageTargetLevel("L2")).toBe(true);
  });

  it("excludes the code spelling the crosswalk mandates for L3-L5", () => {
    // `06_Test-Cases.md#Level` must carry the code form; without these the
    // code form was an unknown value and became a TDD coverage target.
    for (const level of ["L3", "L4", "L5"]) {
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

  it("conservatively includes a genuinely unknown value", () => {
    expect(isCoverageTargetLevel("L9")).toBe(true);
  });

  it("treats empty string as coverage target", () => {
    expect(isCoverageTargetLevel("")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isCoverageTargetLevel("E2E")).toBe(false);
    expect(isCoverageTargetLevel("Unit")).toBe(true);
  });
});
