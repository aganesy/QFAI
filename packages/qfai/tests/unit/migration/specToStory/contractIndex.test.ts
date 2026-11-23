import { describe, expect, it } from "vitest";

import { renderContractIndex } from "../../../../src/migration/specToStory/contractIndex.js";

describe("migration contract index", () => {
  it("lists every row of an old index with more rows than one call takes as arguments", () => {
    // 500,000 arguments overflow the call stack, so spreading the rows into one push would throw.
    const rows = 500_000;
    const table = Array.from(
      { length: rows },
      (_, index) => `| missing-${String(index)}.yaml | Purpose |\n`,
    );
    const target = ".qfai/spec/03_contract/contracts.md";
    const { forAPerson } = renderContractIndex({
      source: `# Contracts\n\n## Contract Index\n\n| File | Purpose |\n| --- | --- |\n${table.join("")}`,
      sourcePath: ".qfai/spec/_policies/05_Contracts.md",
      target,
      contractsDir: ".qfai/spec/03_contract",
      contracts: [],
      oldIds: {},
    });
    expect(forAPerson).toHaveLength(rows);
    expect(forAPerson.at(-1)).toBe(
      `${target}: rewrite the row for missing-${String(rows - 1)}.yaml, which names no contract file, by hand`,
    );
  });
});
