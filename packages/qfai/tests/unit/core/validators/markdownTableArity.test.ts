import { describe, expect, it } from "vitest";

import { findTableArityMismatches } from "../../../helpers/markdownTableArity.js";

describe("Markdown table arity", () => {
  it("names the malformed row and its table", () => {
    const text = [
      "# Contract index",
      "| ID | File | Depends On |",
      "| --- | --- | --- |",
      "| CLI-01 | qfai-validate.md | - |",
      "| CLI-02 | qfai-report.md |",
    ].join("\n");

    expect(findTableArityMismatches(text)).toEqual([
      {
        line: 5,
        tableLabel: "ID",
        headers: ["ID", "File", "Depends On"],
        tableIndex: 0,
        headerCount: 3,
        rowCount: 2,
      },
    ]);
  });
});
