/**
 * `parseHeadings` and fenced code blocks.
 *
 * The heading pattern allows the up-to-three leading spaces CommonMark allows,
 * which is correct — and it collides with YAML written inside a fenced block,
 * because a comment indented by two spaces (`  # unit | integration | …`)
 * satisfies that pattern exactly. A fenced block's contents are not Markdown,
 * so the scan has to know where the fences are.
 *
 * The collision was not hypothetical: the shipped `09_delta.md` template's
 * `Verification.Plan` is a fenced YAML block whose first line is such a
 * comment. Every delta written from it reported a phantom H1 in the middle of
 * the block, `readHeadingBody` truncated the body there, and the plan failed to
 * parse with an error pointing at the fence marker.
 */
import { describe, expect, it } from "vitest";

import { parseHeadings } from "../../src/core/parse/markdown.js";

const doc = (...lines: string[]): string => lines.join("\n");

const titles = (md: string): string[] => parseHeadings(md).map((heading) => heading.title);

describe("parseHeadings", () => {
  it("reads an ATX heading at each level", () => {
    expect(titles(doc("# One", "## Two", "###### Six"))).toEqual(["One", "Two", "Six"]);
    expect(parseHeadings(doc("# One", "## Two")).map((h) => h.level)).toEqual([1, 2]);
  });

  it("reports the 1-based line of each heading", () => {
    expect(parseHeadings(doc("intro", "", "## Section")).map((h) => h.line)).toEqual([3]);
  });

  it("still reads a heading indented by up to three spaces", () => {
    // The rule this file must not undo: three spaces is a heading, and a gate
    // that missed it reported a section the author had written as missing.
    expect(titles(doc("# Doc", "   ### Three spaces"))).toEqual(["Doc", "Three spaces"]);
  });

  it("does not read a heading out of a fenced code block", () => {
    const md = doc(
      "# Doc",
      "",
      "```yaml",
      "- id: VFY-001",
      "  # unit | integration | acceptance",
      "  level: unit",
      "```",
      "",
      "## After",
    );

    expect(titles(md)).toEqual(["Doc", "After"]);
  });

  it("treats a tilde fence the same as a backtick fence", () => {
    expect(titles(doc("# Doc", "~~~yaml", "  # inside", "~~~", "## After"))).toEqual([
      "Doc",
      "After",
    ]);
  });

  it("keeps a shorter run of the fence character as block content", () => {
    // A ``` inside a ```` block closes nothing, so the heading-looking line
    // after it is still inside the block.
    const md = doc("# Doc", "````markdown", "```", "  # inside", "````", "## After");

    expect(titles(md)).toEqual(["Doc", "After"]);
  });

  it("does not close a backtick fence with a tilde fence", () => {
    const md = doc("# Doc", "```yaml", "~~~", "  # still inside", "```", "## After");

    expect(titles(md)).toEqual(["Doc", "After"]);
  });

  it("reads an unterminated fence to end of document", () => {
    // What CommonMark says. Reopening the scan at end of block would let the
    // rest of a truncated document produce headings the renderer never shows.
    expect(titles(doc("# Doc", "```yaml", "  # inside", "## not a heading"))).toEqual(["Doc"]);
  });

  it("resumes reading headings after a block closes", () => {
    const md = doc("# Doc", "```", "  # inside", "```", "## Real", "```", "  # inside", "```");

    expect(titles(md)).toEqual(["Doc", "Real"]);
  });
});
