import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`, for the same reason as the
// reviewer round-budget suite: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const cache = new Map<string, Promise<string>>();
const read = (tree: string, rel: string): Promise<string> => {
  const key = `${tree}::${rel}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = readFile(path.join(repoRoot, tree, rel), "utf-8");
    cache.set(key, pending);
  }
  return pending;
};

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

function expectNoPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).not.toContain(unwrap(phrase));
}

const CONSTITUTION = "assistant/constitution/constitution.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";

describe("the clarification budget binds a stage", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article VI names the unit the budget is spent per`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "## Article VI — Clarification budget (avoid endless Q&A)");
      expectPhrase(content, "**at most 5 clarifying questions per invocation**");
      expectPhrase(content, "The unit is one\n  top-level skill or command invocation");
      // The article binds every non-discussion command, so the unit cannot be a
      // canonical stage: `/qfai-configure` and `/web-research` are neither.
      expectPhrase(content, "`/qfai-configure` or `/web-research`");
      expectPhrase(content, "It is not per session and not per\n  conversation.");
      // "5 clarifying questions total" left the scope open to four readings.
      expectNoPhrase(content, "clarifying questions total");
    });

    it(`${tree}: Article VI says approvals do not spend the budget`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### What spends the budget (MUST)");
      expectPhrase(content, "A **clarification**");
      expectPhrase(content, "does **not** spend budget");
      // The unbounded approval sources are named, so the carve-out is checkable
      // rather than a general escape hatch.
      expectPhrase(content, "`Approved By`");
      // The heading gained "and convergence" upstream; the citation follows it
      // rather than the name it had, which resolved to nothing.
      expectPhrase(
        content,
        "shared-skill-delegation-baseline.md#round-budget-and-convergence-must",
      );
      // A mixed prompt is classified question by question, so one approval
      // cannot carry an unbounded tail of clarifications past the budget.
      expectPhrase(content, "Classify **each question, not the prompt**");
      expectPhrase(content, "spends\n  one unit per clarification it contains");
      expectNoPhrase(content, "A prompt that carries both is an approval");
    });

    it(`${tree}: Article VI defines what exhaustion requires`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### On exhaustion (MUST)");
      expectPhrase(content, "Do not ask a sixth clarification.");
      expectPhrase(content, "Settle the remaining ambiguity the way `--auto`\ndoes");
      expectPhrase(content, "record them in the\ninvocation's output");
      expectPhrase(content, "as Open\nQuestions when the assumption is still unresolved");
      // Exhaustion must not import Article X's blanket no-question mode, or a
      // required approval would become unaskable and unskippable at once.
      expectPhrase(content, "A **required approval is still asked**");
    });

    it(`${tree}: the operating baseline restates the budget where questions are asked`, async () => {
      const content = await read(tree, OPERATING);
      // Article X reaches every skill through this section; without a line here
      // the budget reaches none of them.
      expectPhrase(content, "## User Questions (AskUserQuestion Protocol)");
      expectPhrase(content, "**at most 5 clarifying questions per invocation**");
      expectPhrase(content, "is an **approval** and spends\n  nothing");
      expectPhrase(content, "bundling one into a prompt does not exempt the clarifications");
      expectPhrase(content, "On exhaustion, do not ask a sixth clarification");
      expectPhrase(content, "a required approval may still be asked");
      expectPhrase(content, "constitution.md#article-vi--clarification-budget-avoid-endless-qa");
    });
  }
});
