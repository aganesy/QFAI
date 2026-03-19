import { describe, expect, it } from "vitest";
import { resolveParentTcId, splitTcRefs } from "../../src/core/tddHelpers.js";

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
