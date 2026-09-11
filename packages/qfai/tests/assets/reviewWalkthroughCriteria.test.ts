/**
 * The prototype review asks eight questions, and every one is answerable.
 *
 * The loop used to rate four axes. Rating was removed because a number painted
 * on a judgement is not evidence, and what replaced it has to be something a
 * reviewer can actually answer: eight yes/no criteria, each "no" becoming one
 * line in `blockingFindings`.
 *
 * Two of the eight carry method rather than opinion, and those are the ones
 * pinned hardest here.
 *
 * - Criterion 7 is the streamlined cognitive walkthrough. It needs a task
 *   list, and the screen contract has declared `primary_tasks` all along —
 *   counted and shape-checked, never walked.
 * - Criterion 8 separates a label from an explanation. Getting that backwards
 *   breaks accessibility: WCAG 3.3.2 requires a label for every form input,
 *   and a placeholder standing in for one is a documented failure. The finding
 *   is against the control, not the sentence.
 *
 * The criteria are prose an agent reads, so what can be checked is that the
 * prose is there, says the answerable thing, and does not reintroduce a score.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const REVIEWER_PROMPT = "assistant/skills/qfai-prototyping/references/reviewer-prompt.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The row numbers of the criteria table, read off the table itself. */
function criterionNumbers(markdown: string): number[] {
  const section = markdown.slice(markdown.indexOf("## The eight criteria"));
  const table = section.slice(0, section.indexOf("Criteria 1 to 4"));
  return Array.from(table.matchAll(/^\|\s*(\d+)\s*\|/gm), (m) => Number(m[1]));
}

describe("the prototype review asks eight answerable questions", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the criteria table is numbered 1 to 8`, async () => {
      expect(criterionNumbers(await read(tree, REVIEWER_PROMPT))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it(`${tree}: a "no" is one line in blockingFindings, and nothing aggregates`, async () => {
      const text = flat(await read(tree, REVIEWER_PROMPT));

      expect(text).toContain("A **no** is one line in `blockingFindings`");
      // The rating this replaced must not come back under another name.
      expect(text).toContain("No axis, no rating, no aggregate.");
    });

    it(`${tree}: criterion 7 walks the declared tasks with two questions`, async () => {
      const text = flat(await read(tree, REVIEWER_PROMPT));

      expect(text).toContain("`primary_tasks`");
      expect(text).toContain("Will the user know what to do here?");
      expect(text).toMatch(/Will the response tell them they did the right thing/);
      expect(text).toContain("cognitive walkthrough");
    });

    // The correction that makes this criterion safe to act on. An agent told to
    // remove explanatory text, and not told this, strips labels too.
    it(`${tree}: criterion 8 protects the label and targets the explanation`, async () => {
      const text = flat(await read(tree, REVIEWER_PROMPT));

      expect(text).toContain("a label is not an explanation");
      expect(text).toContain("WCAG 3.3.2 requires a label for every form input");
      expect(text).toContain("names the control to fix, not the sentence to delete");
      expect(text).toContain("Labels stay.");
    });

    // Criteria 6 to 8 read counts. A reviewer told to consider the counts and
    // not told where they are counts by eye, which is the number nobody can
    // reproduce — so the prompt names the file and forbids recounting.
    it(`${tree}: the counts are read from the capture's sidecar, not recounted`, async () => {
      const text = flat(await read(tree, REVIEWER_PROMPT));

      expect(text).toContain("iter-NN/<screen>.signals.json");
      expect(text).toContain("Read them; do not recount.");
      // An absent denominator is unknown. Reading it as zero turns "no task
      // declared" into "no controls", which is the opposite of the capture.
      expect(text).toContain("`null`, which means unknown, not zero");
      // And a count still gates nothing on its own.
      expect(text).toContain("write no finding a number alone would make");
    });

    // Criteria 1 to 4 are the ladder. If the reviewer's copy drifts from the
    // ladder's own file, a screen passes review by a standard nobody built to.
    it(`${tree}: criteria 1 to 4 cite the procurement ladder`, async () => {
      const text = await read(tree, REVIEWER_PROMPT);

      expect(text).toContain("`.qfai/assistant/catalog/ui-procurement.md`");
      expect(flat(text)).toContain("Criteria 1 to 4 are the procurement ladder read as questions");
    });

    // Each role named in the review carries its line, so the criteria reach the
    // stage that applies them rather than living only in the loop.
    it(`${tree}: every role that checks procurement carries the line`, async () => {
      const catalog = await read(tree, CATALOG);
      const cards = catalog.split(/^ {2}- id: /m).slice(1);

      const missing = [
        "product-experience-architect",
        "frontend-engineer",
        "product-surface-reviewer",
        "architecture-reviewer",
        "implementation-reviewer",
      ].filter((role) => {
        const card = cards.find((entry) => entry.startsWith(`${role}\n`));
        return card === undefined || !card.includes("ui-procurement.md");
      });

      expect(missing, "a role named in the review with no procurement line").toEqual([]);
    });
  }
});
