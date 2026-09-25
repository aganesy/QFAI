import { describe, expect, it } from "vitest";

import { collapseIdRuns } from "../../src/core/validators/layerCoverage.js";

describe("collapseIdRuns", () => {
  it("collapses a contiguous numeric run into a range", () => {
    expect(collapseIdRuns(["BR-0003-0001", "BR-0003-0002", "BR-0003-0003"])).toEqual([
      "BR-0003-0001..BR-0003-0003",
    ]);
  });

  it("keeps a lone ID as-is and splits on a gap", () => {
    expect(collapseIdRuns(["AC-0001", "AC-0002", "AC-0009"])).toEqual([
      "AC-0001..AC-0002",
      "AC-0009",
    ]);
  });

  it("does not merge across differing stems", () => {
    expect(collapseIdRuns(["BR-0001-0002", "BR-0002-0003"])).toEqual([
      "BR-0001-0002",
      "BR-0002-0003",
    ]);
  });

  it("returns an empty list for no IDs", () => {
    expect(collapseIdRuns([])).toEqual([]);
  });

  it("orders the input itself rather than trusting the caller", () => {
    // The run detection needs the ids in order, and this is exported. An
    // unsorted argument used to produce silently wrong output — the run broken
    // into fragments — rather than anything a caller would notice.
    expect(collapseIdRuns(["AC-0003", "AC-0001", "AC-0002"])).toEqual(["AC-0001..AC-0003"]);
  });

  it("does not mutate the caller's array", () => {
    const ids = ["AC-0003", "AC-0001"];
    collapseIdRuns(ids);
    expect(ids).toEqual(["AC-0003", "AC-0001"]);
  });
});
