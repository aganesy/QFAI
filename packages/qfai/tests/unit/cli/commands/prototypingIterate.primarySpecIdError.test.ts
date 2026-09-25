import { describe, expect, it } from "vitest";

import { parsePrimaryUiContract } from "../../../../src/core/prototyping/primarySpecIdParse.js";

describe("primary UI contract input diagnostics", () => {
  it.each(["abc", "0001", "CON-UI-10000"])("names the shape and received input %s", (input) => {
    const result = parsePrimaryUiContract(input);
    expect(result).toEqual({
      ok: false,
      error: `primaryUiContract must be a full CON-UI-NNNN ID; received ${input}`,
    });
  });

  it("rejects non-string input", () => {
    expect(parsePrimaryUiContract(null).ok).toBe(false);
    expect(parsePrimaryUiContract(undefined).ok).toBe(false);
    expect(parsePrimaryUiContract(1).ok).toBe(false);
  });
});
