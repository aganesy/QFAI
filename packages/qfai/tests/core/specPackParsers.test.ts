import { describe, expect, it } from "vitest";

import { parseFirstMarkdownTable, splitMarkdownRow } from "../../src/core/specPackParsers.js";

describe("splitMarkdownRow", () => {
  it("splits standard row with single leading/trailing pipes", () => {
    expect(splitMarkdownRow("| A | B | C |")).toEqual(["A", "B", "C"]);
  });

  it("normalizes double leading pipes (||) to match single-pipe rows", () => {
    expect(splitMarkdownRow("|| A | B | C |")).toEqual(["A", "B", "C"]);
  });

  it("normalizes triple leading pipes", () => {
    expect(splitMarkdownRow("||| A | B |")).toEqual(["A", "B"]);
  });

  it("normalizes double trailing pipes", () => {
    expect(splitMarkdownRow("| A | B ||")).toEqual(["A", "B"]);
  });

  it("preserves intentional empty cell (space between pipes)", () => {
    expect(splitMarkdownRow("| | A | B |")).toEqual(["", "A", "B"]);
  });

  it("handles escaped pipes", () => {
    expect(splitMarkdownRow("| A \\| B | C |")).toEqual(["A | B", "C"]);
  });
});

describe("parseFirstMarkdownTable", () => {
  it("parses table with || header and | rows consistently", () => {
    const text = ["|| Col1 | Col2 |", "| --- | --- |", "| a | b |"].join("\n");
    const table = parseFirstMarkdownTable(text);
    expect(table).toBeDefined();
    expect(table?.headers).toEqual(["Col1", "Col2"]);
    expect(table?.rows).toEqual([["a", "b"]]);
  });

  it("parses standard single-pipe table unchanged", () => {
    const text = ["| Col1 | Col2 |", "| --- | --- |", "| a | b |"].join("\n");
    const table = parseFirstMarkdownTable(text);
    expect(table).toBeDefined();
    expect(table?.headers).toEqual(["Col1", "Col2"]);
    expect(table?.rows).toEqual([["a", "b"]]);
  });
});
