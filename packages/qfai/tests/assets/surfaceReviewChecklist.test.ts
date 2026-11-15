/**
 * The product-surface reviewer walks one sourced checklist on every screen.
 *
 * Review rounds of the same screen raised different classes of issue because
 * nothing fixed what a round covers. The checklist lists the screen
 * completeness checks, Nielsen's ten heuristics, twelve WCAG 2.2 criteria and
 * one APG item per widget, each with its source, and the reviewer reports
 * every item as pass, finding or not applicable.
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const assistant = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
);
const CHECKLIST = "rule/references/surface-review-checklist.md";
const CARD = "agent/product-surface-reviewer.md";

const read = (relative: string): Promise<string> =>
  readFile(path.join(assistant, ...relative.split("/")), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

/** The first cell of every table row whose first cell is a code span. */
function itemIds(markdown: string): string[] {
  return Array.from(markdown.matchAll(/^\| `([^`]+)` +\|/gm), (match) => match[1] ?? "");
}

const WCAG = [
  ["1.3.1", "info-and-relationships"],
  ["1.4.3", "contrast-minimum"],
  ["1.4.10", "reflow"],
  ["1.4.11", "non-text-contrast"],
  ["2.1.1", "keyboard"],
  ["2.4.3", "focus-order"],
  ["2.4.7", "focus-visible"],
  ["2.4.11", "focus-not-obscured-minimum"],
  ["2.5.8", "target-size-minimum"],
  ["3.3.1", "error-identification"],
  ["3.3.2", "labels-or-instructions"],
  ["4.1.2", "name-role-value"],
] as const;

// QFAI:EX-0001-0304-02
describe("the surface review checklist lists sourced items in a fixed order", () => {
  it("has the four item sections after how to walk it and the report", async () => {
    const headings = (await read(CHECKLIST))
      .split(/\r?\n/)
      .filter((line) => line.startsWith("## "));
    expect(headings).toEqual([
      "## Contents",
      "## How to walk it",
      "## The report",
      "## Screen completeness",
      "## Usability heuristics",
      "## Accessibility criteria",
      "## Widget patterns",
    ]);
  });

  it("lists the completeness lines, ten heuristics and twelve criteria in order", async () => {
    const ids = itemIds(await read(CHECKLIST));
    expect(ids).toEqual([
      "FLOOR",
      "TYPE",
      ...Array.from({ length: 10 }, (_, index) => `H${String(index + 1)}`),
      ...WCAG.map(([criterion]) => `WCAG ${criterion}`),
    ]);
  });

  it("names a source for each section and each criterion's Understanding page", async () => {
    const text = await read(CHECKLIST);
    expect(text).toContain("<https://www.nngroup.com/articles/ten-usability-heuristics/>");
    expect(text).toContain("<https://www.w3.org/TR/WCAG22/>");
    expect(text).toContain("<https://www.w3.org/WAI/ARIA/apg/patterns/>");
    for (const [criterion, slug] of WCAG) {
      const row = text.split(/\r?\n/).find((line) => line.startsWith(`| \`WCAG ${criterion}\``));
      expect(row, criterion).toContain(`<https://www.w3.org/WAI/WCAG22/Understanding/${slug}>`);
    }
  });

  it("asks keyboard, roles and focus of every widget against its APG pattern", async () => {
    const text = flat(await read(CHECKLIST));
    expect(text).toContain("add one item per widget, with the ID `APG <slug>`");
    expect(text).toContain(
      "The slug is the pattern's path segment under `/WAI/ARIA/apg/patterns/`",
    );
    for (const question of ["**Keyboard.**", "**Roles, states and properties.**", "**Focus.**"]) {
      expect(text).toContain(question);
    }
    expect(text).toContain(
      ".qfai/assistant/rule/ui-procurement.md#widgets-that-are-not-hand-authored",
    );
  });

  it("reports each item as pass, finding or not applicable, never only not checked", async () => {
    const text = flat(await read(CHECKLIST));
    for (const result of ["| pass |", "| finding |", "| not applicable |"]) {
      expect(text).toContain(result);
    }
    expect(text).toContain('"Not checked" is not a reason');
  });

  // A paraphrase that drops a criterion's exceptions turns a conforming screen
  // into a blocking finding.
  it("keeps the exceptions of the contrast, non-text contrast and target size criteria", async () => {
    const rows = (await read(CHECKLIST)).split(/\r?\n/);
    const row = (criterion: string): string =>
      rows.find((line) => line.startsWith(`| \`WCAG ${criterion}\``)) ?? "";
    expect(row("1.4.3")).toContain(
      "Text on a disabled control, decorative or incidental text, and logos are exempt.",
    );
    expect(row("1.4.10")).toContain("256 CSS pixels high");
    expect(row("1.4.11")).toContain(
      "the visual information needed to identify a control or its state reach 3:1",
    );
    expect(row("1.4.11")).toContain("A disabled control");
    for (const exception of [
      "a 24-pixel circle centred on it intersects no other target or another target's circle",
      "an equivalent control on the same page meets the size",
      "inline in a sentence or block of text",
      "the browser sets its size and the author left it",
      "essential or legally required",
    ]) {
      expect(row("2.5.8"), exception).toContain(exception);
    }
  });

  it("makes one defect one finding at the strictest severity of its lines", async () => {
    const text = flat(await read(CHECKLIST));
    expect(text).toContain(
      "every line it answers points at that one finding, and the finding takes the strictest severity any of those lines allows",
    );
  });

  it("marks TYPE not applicable when the UI contract names no pattern", async () => {
    expect(flat(await read(CHECKLIST))).toContain(
      "`TYPE` is not applicable on an application screen whose UI contract names no `pattern`",
    );
  });
});

// QFAI:EX-0001-0304-03
describe("the product-surface reviewer walks the checklist on every review", () => {
  it("cites a checklist that ships, for every screen on every review", async () => {
    const card = flat(await read(CARD));
    await access(path.join(assistant, ...CHECKLIST.split("/")));
    expect(card).toContain(
      `Walk \`.qfai/assistant/${CHECKLIST}\` for every screen the review covers, on every review, whatever the request's focus`,
    );
    expect(card).toContain("report each item as `pass`, `finding` or `not applicable`");
  });

  it("records the two completeness checks once, as the FLOOR and TYPE lines", async () => {
    const card = flat(await read(CARD));
    expect(card).toContain(
      "Its `FLOOR` and `TYPE` lines record the two completeness checks above; do not walk them twice.",
    );
  });

  it("routes heuristic findings by the card and accessibility findings to the safety floor", async () => {
    const card = flat(await read(CARD));
    expect(card).toContain(
      'A "no" on a usability heuristic is filed under the route on this card it matches',
    );
    expect(card).toContain(
      "one no route covers is `advisory` with `Traces to: none`, unless it is a defect demonstrable from the changed artifacts, which takes its `defect:*` class",
    );
    expect(card).toContain(
      "traces to the accessibility item of the safety floor in `.agents/rules/minimal-implementation.md` § 2",
    );
  });

  it("blocks an accessibility finding only on what the change adds, alters or breaks", async () => {
    expect(flat(await read(CARD))).toContain(
      "It is blocking when the failing element is one the change adds or alters, or the change causes the failure; it is `advisory` when it predates the change on an element the change leaves alone, even on an altered screen.",
    );
  });
});
