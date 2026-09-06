import { describe, expect, it } from "vitest";

import {
  maskNonSpecRegions,
  parseFirstMarkdownTable,
  splitMarkdownRow,
} from "../../src/core/specPackParsers.js";

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

describe("maskNonSpecRegions", () => {
  const visible = (text: string): string[] =>
    maskNonSpecRegions(text)
      .split("\n")
      .filter((line) => line.trim().length > 0);

  it("blanks a raw HTML block and everything it holds", () => {
    const text = [
      "# doc",
      "",
      "<pre>",
      "## Risks",
      "| TC-ID | Title |",
      "</pre>",
      "",
      "## Scope",
    ].join("\n");

    expect(visible(text)).toEqual(["# doc", "## Scope"]);
    // Line count is preserved so reported line numbers stay accurate.
    expect(maskNonSpecRegions(text).split("\n")).toHaveLength(8);
  });

  it("closes a raw HTML block that opens and closes on one line", () => {
    expect(visible(["<pre>## Risks</pre>", "## Scope"].join("\n"))).toEqual(["## Scope"]);
  });

  it("leaves a blank-line-terminated HTML block's Markdown alone", () => {
    // `<div>` is not a type-1 block: the blank line ends it and Markdown
    // resumes, so blanking `## Scope` here would hide a real heading. The tag
    // lines are one-line type-6 blocks in their own right and are raw HTML, so
    // they are blanked — what must survive is the heading between them.
    expect(visible(["<div>", "", "## Scope", "", "</div>"].join("\n"))).toEqual(["## Scope"]);
  });

  it("masks a type-6 HTML block up to its terminating blank line", () => {
    // Type 1 covers only `<pre>`, `<script>`, `<style>` and `<textarea>`.
    // `<div>` and the rest run to the next blank line, and until then their
    // contents are just as raw: a `## Risks` with no blank line above it is
    // markup, not a section, and counting it satisfied a required-heading gate
    // with a heading the author never wrote.
    expect(visible(["<div>", "## Risks", "</div>", "", "## Scope"].join("\n"))).toEqual([
      "## Scope",
    ]);
  });

  it("resumes Markdown after the blank line that ends a type-6 block", () => {
    expect(visible(["<table>", "| a |", "", "## Risks"].join("\n"))).toEqual(["## Risks"]);
  });

  it("does not open a type-6 block on prose that merely mentions the tag", () => {
    expect(visible(["A `<div>` wrapper is fine.", "## Scope"].join("\n"))).toEqual([
      "A `<div>` wrapper is fine.",
      "## Scope",
    ]);
  });

  it("reads a type-6 tag inside a fenced sample as sample text", () => {
    expect(visible(["```html", "<div>", "```", "## Scope"].join("\n"))).toEqual(["## Scope"]);
  });

  it("does not open a raw HTML block on prose that merely mentions the tag", () => {
    expect(visible(["Use a `<pre>` block for samples.", "## Scope"].join("\n"))).toEqual([
      "Use a `<pre>` block for samples.",
      "## Scope",
    ]);
  });
});
