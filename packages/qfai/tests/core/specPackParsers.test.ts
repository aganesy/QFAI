import { describe, expect, it } from "vitest";

import {
  escapeTableCell,
  maskNonSpecRegions,
  parseAllMarkdownTables,
  parseRenderedMarkdownTables,
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

  // Every trailing pipe was stripped before decoding, so an escaped pipe that
  // ended the last cell of a row without a closing delimiter was lost.
  it("keeps an escaped pipe that ends the last cell without a closing pipe", () => {
    expect(splitMarkdownRow("| x | text\\|")).toEqual(["x", "text|"]);
  });

  it("keeps an escaped pipe that ends the last cell before a closing pipe", () => {
    expect(splitMarkdownRow("| x | text\\||")).toEqual(["x", "text|"]);
    expect(splitMarkdownRow("| x | text\\| |")).toEqual(["x", "text|"]);
  });

  it("counts the consecutive backslashes before the final pipe", () => {
    expect(splitMarkdownRow(String.raw`| x | path\|`)).toEqual(["x", "path|"]);
    expect(splitMarkdownRow(String.raw`| x | path\\|`)).toEqual(["x", String.raw`path\\`]);
    expect(splitMarkdownRow(String.raw`| x | path\\\||`)).toEqual(["x", String.raw`path\\|`]);
  });
});

// escapeTableCell and splitMarkdownRow must agree on what a cell can contain.
// The parser only un-escapes `\|` to `|`, so a literal `\` must be written
// as-is and never doubled; otherwise Windows paths and regex literals change
// silently on a round trip.
describe("escapeTableCell ↔ splitMarkdownRow round-trip identity", () => {
  function roundTrip(...values: string[]): string[] {
    return splitMarkdownRow(`| ${values.map(escapeTableCell).join(" | ")} |`);
  }

  it("plain text round-trips unchanged", () => {
    expect(roundTrip("hello world", "see related discussion")).toEqual([
      "hello world",
      "see related discussion",
    ]);
  });

  it("backslashes round-trip unchanged", () => {
    expect(roundTrip("C:\\Users\\spec.md", "matches \\d+ pattern")).toEqual([
      "C:\\Users\\spec.md",
      "matches \\d+ pattern",
    ]);
  });

  it("a backslash before a pipe round-trips unchanged", () => {
    expect(roundTrip("a\\|b", "regex (?:foo|\\bar)")).toEqual(["a\\|b", "regex (?:foo|\\bar)"]);
  });

  it("a backslash pair before a pipe round-trips unchanged", () => {
    expect(roundTrip("path\\\\|file")).toEqual(["path\\\\|file"]);
  });

  it("CRLF and CR line breaks collapse to a single space", () => {
    expect(roundTrip("line1\r\nline2", "line1\rline2")).toEqual(["line1 line2", "line1 line2"]);
  });
});

describe("parseRenderedMarkdownTables", () => {
  const header = "| Label | Expected |";
  const separator = "| --- | --- |";

  // QFAI:EX-0001-0039-77
  it.each([
    ["123. Sample:\n     ```md", "     ```", "     "],
    ["123. ```md", "", "     "],
    ["- - ~~~md", "    ~~~", "    "],
    ["123.\n     ~~~md", "     ~~~", "     "],
  ])("ignores a fenced table inside list content starting with %j", (opener, closer, indent) => {
    const text = [
      header,
      separator,
      "| Before | visible |",
      "",
      opener,
      indent + header,
      indent + separator,
      indent + "| Inside | hidden |",
      closer,
      "",
      header,
      separator,
      "| After | visible |",
    ].join("\n");

    expect(parseRenderedMarkdownTables(text)).toEqual([
      { headers: ["Label", "Expected"], rows: [["Before", "visible"]] },
      { headers: ["Label", "Expected"], rows: [["After", "visible"]] },
    ]);
  });

  // QFAI:EX-0001-0039-77
  it.each([
    ["", ""],
    ["123. Visible table:\n\n", "     "],
  ])("keeps cells between incomplete comments on separate rows after %j", (prefix, indent) => {
    const text =
      prefix +
      [
        header,
        separator,
        "| Starts with <!-- | first |",
        "| Changes | visible |",
        "| Ends with --> | last |",
      ]
        .map((row) => indent + row)
        .join("\n");

    expect(parseRenderedMarkdownTables(text)).toEqual([
      {
        headers: ["Label", "Expected"],
        rows: [
          ["Starts with <!--", "first"],
          ["Changes", "visible"],
          ["Ends with -->", "last"],
        ],
      },
    ]);
  });

  // QFAI:EX-0001-0039-77
  it.each([
    ["", ""],
    ["- - -\n", "  "],
  ])("omits tables in ordinary fences and HTML comment blocks after %j", (prefix, indent) => {
    const text = [
      prefix + indent + "~~~md",
      header,
      separator,
      "| Fenced | hidden |",
      indent + "~~~",
      "",
      "<!--",
      header,
      separator,
      "| Commented | hidden |",
      "-->",
      "",
      header,
      separator,
      "| After | visible |",
    ].join("\n");

    expect(parseRenderedMarkdownTables(text)).toEqual([
      { headers: ["Label", "Expected"], rows: [["After", "visible"]] },
    ]);
  });

  // QFAI:EX-0001-0039-77
  it.each([
    ["unequal columns", "", "| --- |"],
    ["four-column root indentation", "    ", separator],
  ])(
    "keeps a table candidate with %s inside its multiline inline comment",
    (_case, indent, delimiter) => {
      const text = [
        "Before <!--",
        indent + header,
        indent + delimiter,
        indent + "| Hidden | example |",
        "--> after",
        "",
        header,
        separator,
        "| After | visible |",
      ].join("\n");

      expect(parseRenderedMarkdownTables(text)).toEqual([
        { headers: ["Label", "Expected"], rows: [["After", "visible"]] },
      ]);
    },
  );
});

describe("maskNonSpecRegions", () => {
  const visible = (text: string): string[] =>
    maskNonSpecRegions(text)
      .split("\n")
      .filter((line) => line.trim().length > 0);

  it("reads a comment marker in a code span as the text it is", () => {
    // The scan found `<!--` anywhere on the line and hid everything after it.
    // A document that quotes the marker — and a spec pack explaining its own
    // ignore comment does — lost every heading and table below the sentence.
    const text = [
      "# doc",
      "",
      "Write `<!-- mdschema:ignore -->` to opt a document out.",
      "",
      "## Scope",
    ].join("\n");

    expect(visible(text)).toEqual([
      "# doc",
      "Write `<!-- mdschema:ignore -->` to opt a document out.",
      "## Scope",
    ]);
  });

  it("reads a comment marker in a fence info string as the sample's label", () => {
    // The comment scan ran before the fence was recognised, so a marker in the
    // info string opened a comment that swallowed the rest of the document
    // rather than a fenced sample that ends three lines later.
    const text = [
      "# doc",
      "",
      "```text <!-- an unclosed marker",
      "## Risks",
      "```",
      "",
      "## Scope",
    ].join("\n");

    expect(visible(text)).toEqual(["# doc", "## Scope"]);
  });

  it("still hides a comment that opens outside a code span", () => {
    const text = ["# doc", "", "<!-- `not code` -->", "", "## Scope"].join("\n");

    expect(visible(text)).toEqual(["# doc", "## Scope"]);
  });

  it("blanks the rest of a line a comment opens or an open comment runs into", () => {
    // Stripping only the comment handed what followed it back at the start of
    // the line, so `<!-- note --> ## Risks` read as a heading and a fence after
    // a closing `-->` hid the rest of the document.
    const text = [
      "# doc",
      "",
      "<!-- note --> ## Risks",
      "",
      "<!--",
      "a note",
      "--> ```",
      "",
      "## Scope",
      "",
      "Text <!-- aside --> ends here.",
    ].join("\n");

    expect(visible(text)).toEqual(["# doc", "## Scope", "Text  ends here."]);
    expect(maskNonSpecRegions(text).split("\n")).toHaveLength(11);
  });

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

  it("blanks a CDATA section up to its end marker, past blank lines", () => {
    // Only types 1 and 6 were blanked, so a heading and its obligations in a
    // CDATA section read as a real section and cleared the gate that needs it.
    const text = [
      "# doc",
      "",
      "<![CDATA[",
      "## Reviewer Gate Baseline",
      "",
      "- an obligation",
      "]]>",
      "",
      "## Scope",
    ].join("\n");

    expect(visible(text)).toEqual(["# doc", "## Scope"]);
    expect(maskNonSpecRegions(text).split("\n")).toHaveLength(9);
  });

  it("blanks a processing instruction up to its end marker", () => {
    expect(visible(["<?xml-note", "## Risks", "", "?>", "## Scope"].join("\n"))).toEqual([
      "## Scope",
    ]);
  });

  it("blanks a declaration up to its end marker, and one that closes on its line", () => {
    expect(visible(["<!DOCTYPE note", "## Risks", "", ">", "## Scope"].join("\n"))).toEqual([
      "## Scope",
    ]);
    expect(visible(["<!DOCTYPE html>", "## Scope"].join("\n"))).toEqual(["## Scope"]);
  });

  it("masks a custom-element block up to its terminating blank line", () => {
    const text = [
      "<review-note data-kind='sample'>",
      "## Risks",
      "</review-note>",
      "",
      "## Scope",
    ].join("\n");

    expect(visible(text)).toEqual(["## Scope"]);
  });

  it("does not let a custom-element tag interrupt a paragraph", () => {
    // A type-7 block cannot interrupt a paragraph, so the tag line and what
    // follows it are paragraph text.
    expect(visible(["Some prose.", "<review-note>", "## Scope"].join("\n"))).toEqual([
      "Some prose.",
      "<review-note>",
      "## Scope",
    ]);
  });

  it("opens a custom-element block right under a heading", () => {
    expect(visible(["## Scope", "<review-note>", "## Risks"].join("\n"))).toEqual(["## Scope"]);
  });

  it("does not open a custom-element block on a tag with text after it", () => {
    expect(visible(["<review-note> inline", "## Scope"].join("\n"))).toEqual([
      "<review-note> inline",
      "## Scope",
    ]);
  });

  it("does not open a raw HTML block on prose that merely mentions the tag", () => {
    expect(visible(["Use a `<pre>` block for samples.", "## Scope"].join("\n"))).toEqual([
      "Use a `<pre>` block for samples.",
      "## Scope",
    ]);
  });

  it("keeps comment-like text when its delimiters are in separate table rows", () => {
    const text = [
      "| ID | Note |",
      "| --- | --- |",
      "| CLI-0001 | a <!-- todo |",
      "| CLI-0002 | b --> |",
      "| CLI-0003 | c |",
    ].join("\n");

    const [table] = parseAllMarkdownTables(maskNonSpecRegions(text));
    expect(table?.rows).toEqual([
      ["CLI-0001", "a <!-- todo"],
      ["CLI-0002", "b -->"],
      ["CLI-0003", "c"],
    ]);
  });

  it("ends the paragraph of a mid-line `<!--` at a line that starts another block", () => {
    // Only a blank line, a heading, a thematic break or a fence ended the
    // paragraph, so the `-->` of the comment block on the next line closed the
    // inline one and the text after `x ` was lost.
    expect(visible(["x <!-- a", "<!-- note -->", "## Scope"].join("\n"))).toEqual([
      "x <!-- a",
      "## Scope",
    ]);
    expect(visible(["x <!-- a", "<div>-->", "", "## Scope"].join("\n"))).toEqual([
      "x <!-- a",
      "## Scope",
    ]);
    expect(visible(["x <!-- a", "> b --> c", "## Scope"].join("\n"))).toEqual([
      "x <!-- a",
      "> b --> c",
      "## Scope",
    ]);
    expect(visible(["x <!-- a", "- b --> c", "## Scope"].join("\n"))).toEqual([
      "x <!-- a",
      "- b --> c",
      "## Scope",
    ]);
  });

  it("reads no heading or fence in the text after a mid-line comment closes", () => {
    expect(visible(["Text <!-- a", "b --> ## Risks", "", "## Scope"].join("\n"))).toEqual([
      "Text ",
      "## Scope",
    ]);
    expect(visible(["Text <!-- a", "b --> ```", "", "## Scope"].join("\n"))).toEqual([
      "Text ",
      " ```",
      "## Scope",
    ]);
  });

  it("reads a mid-line `<!--` that no later `-->` closes as text", () => {
    // The unclosed marker opened a comment that hid the rest of the document.
    expect(visible(["| x | <!-- or // |", "", "## Scope"].join("\n"))).toEqual([
      "| x | <!-- or // |",
      "## Scope",
    ]);
  });

  it("reads a mid-line `<!--` as text when the only later `-->` is past its paragraph", () => {
    // Any `-->` further down the document counted as its closer, so a later
    // guidance comment, or one inside a fenced sample, hid everything between.
    expect(
      visible(["| x | <!-- or // |", "", "## Scope", "", "<!-- guidance -->"].join("\n")),
    ).toEqual(["| x | <!-- or // |", "## Scope"]);
    expect(
      visible(["Text <!-- a", "", "```html", "<!-- sample -->", "```", "", "## Scope"].join("\n")),
    ).toEqual(["Text <!-- a", "## Scope"]);
  });

  it("opens nothing with a `<!--` after the `-->` that ends a comment block", () => {
    // CommonMark ends the block on the line holding `-->`, so the marker after
    // it is raw block text and the next line is free.
    expect(visible(["<!-- a --> x <!-- b", "## Scope"].join("\n"))).toEqual(["## Scope"]);
  });

  it("still hides the rest of the document after a line-opening comment that never closes", () => {
    // CommonMark runs an unclosed comment block to the end of the document,
    // and a renderer shows nothing after it.
    expect(visible(["# doc", "", "<!-- draft", "", "## Scope"].join("\n"))).toEqual(["# doc"]);
  });
});
