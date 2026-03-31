import { describe, expect, it } from "vitest";

import { extractInvalidIds } from "../../src/core/ids.js";

describe("extractInvalidIds", () => {
  it("does not treat layered column headers as invalid IDs", () => {
    const text = [
      "| BR-ID | Title | AC-Refs | Rule |",
      "| ----- | ----- | ------- | ---- |",
      "| BR-0023-0001 | sample | AC-0023-0001 | body |",
      "",
      "| TC-ID | Level | AC-Refs | EX-Ref |",
      "| ----- | ----- | ------- | ------ |",
      "| TC-0002-0001 | L2 | AC-0023-0001 | EX-0023-0001 |",
    ].join("\n");

    const invalid = extractInvalidIds(text, ["BR", "AC", "US", "SPEC"]);

    expect(invalid).toEqual([]);
  });

  it("does not treat prose words like spec-pack as invalid IDs", () => {
    const invalid = extractInvalidIds(
      "This spec-pack remains valid while SPEC-0001 is the canonical ID.",
      ["SPEC"],
    );

    expect(invalid).toEqual([]);
  });
});
