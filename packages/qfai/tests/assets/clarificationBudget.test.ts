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
      expectPhrase(content, "**at most 5 clarifying questions per stage invocation**");
      expectPhrase(content, "It is not per\n  session and not per conversation.");
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
      expectPhrase(content, "shared-skill-delegation-baseline.md#round-budget-must");
      expectPhrase(content, "A prompt that carries both is an approval");
    });

    it(`${tree}: Article VI defines what exhaustion requires`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### On exhaustion (MUST)");
      expectPhrase(content, "Do not ask a sixth clarification.");
      expectPhrase(content, "Continue exactly as `--auto` does");
      expectPhrase(content, "record them in the stage output");
      expectPhrase(content, "as Open\nQuestions when the assumption is still unresolved");
    });

    it(`${tree}: the operating baseline restates the budget where questions are asked`, async () => {
      const content = await read(tree, OPERATING);
      // Article X reaches every skill through this section; without a line here
      // the budget reaches none of them.
      expectPhrase(content, "## User Questions (AskUserQuestion Protocol)");
      expectPhrase(content, "**at most 5 clarifying questions per stage invocation**");
      expectPhrase(content, "is an **approval** and spends nothing");
      expectPhrase(content, "On exhaustion, do not ask a\n  sixth");
      expectPhrase(content, "constitution.md#article-vi--clarification-budget-avoid-endless-qa");
    });
  }
});
