/**
 * Brace ranges read the way fast-glob expands them.
 *
 * Each expectation is what fast-glob's own brace expander returns for the same
 * body, so a matcher built on these members selects the names the scan collects.
 */
import { describe, expect, it } from "vitest";

import { BraceRangeRefused, braceRangeMembers } from "../../../src/core/globBraceRange.js";

describe("braceRangeMembers", () => {
  it.each([
    ["1..5", ["1", "2", "3", "4", "5"]],
    ["5..1", ["5", "4", "3", "2", "1"]],
    ["01..03", ["01", "02", "03"]],
    ["0..10..0005", ["0000", "0005", "0010"]],
    ["-01..2", ["-01", "000", "001", "002"]],
    ["1..10..3", ["1", "4", "7", "10"]],
    ["1..3..", ["1", "2", "3"]],
    // Measured against the expander: `1e3` is a thousand and `1.0` is one.
    ["1e3..1e3", ["1000"]],
    ["1.0..3", ["1", "2", "3"]],
    // Written like a number and not a whole one: the expander leaves the
    // range as text, so the pattern names a file spelled with the braces in
    // it and this reads no member out of it.
    ["1.5..3", null],
    ["1..2.5", null],
    ["a..e..2", ["a", "c", "e"]],
  ])("expands %s", (body, members) => {
    expect(braceRangeMembers(body)).toEqual(members);
  });

  it("pads only on a leading zero, never on a leading plus sign", () => {
    // A plus sign is a sign, so `+001` is the number 1 written unpadded.
    expect(braceRangeMembers("0..+001")).toEqual(["0", "1"]);
    expect(braceRangeMembers("+001..+003")).toEqual(["1", "2", "3"]);
    // A padded part still sets the width, a signed part included.
    expect(braceRangeMembers("01..+3")).toEqual(["01", "02", "03"]);
  });

  it.each(["a", "1..", "..3", "a..zz", "0x10..0x10", "1..3..x"])("reads %s as no range", (body) => {
    expect(braceRangeMembers(body)).toBeNull();
  });

  it("refuses a range of a thousand steps or more written without an increment", () => {
    expect(() => braceRangeMembers("0..1000")).toThrow(BraceRangeRefused);
    expect(braceRangeMembers("0..999")).toHaveLength(1000);
  });

  it("expands a range written with an increment whatever its length, up to the member cap", () => {
    expect(braceRangeMembers("0..9999..5")).toHaveLength(2000);
    // Past the cap the range matches nothing rather than compiling an unbounded expression.
    expect(braceRangeMembers("0..20000..1")).toEqual([]);
  });
});
