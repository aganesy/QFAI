import { describe, expect, it } from "vitest";

import { parsePrimaryUiContract } from "../../../../src/core/prototyping/primarySpecIdParse.js";

describe("parsePrimaryUiContract", () => {
  // QFAI:EX-0001-0142-01
  it("accepts the complete UI-NNNN ID unchanged", () => {
    expect(parsePrimaryUiContract("UI-0001")).toEqual({
      ok: true,
      uiContractId: "UI-0001",
    });
    expect(parsePrimaryUiContract("UI-9999")).toEqual({
      ok: true,
      uiContractId: "UI-9999",
    });
  });

  // QFAI:EX-0001-0142-01
  it.each(["0001", "1", "UI-1", "UI-10000", " con-UI-0001", "../UI-0001"])(
    "rejects non-canonical input %s without normalisation",
    (input) => {
      const result = parsePrimaryUiContract(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("UI-NNNN");
        expect(result.error).toContain(input);
      }
    },
  );
});
