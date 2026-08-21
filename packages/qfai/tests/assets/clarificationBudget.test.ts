import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo.
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

const CONSTITUTION = "assistant/constitution/constitution.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";
const SDD = "assistant/skills/qfai-sdd/SKILL.md";
const CONFIGURE = "assistant/skills/qfai-configure/SKILL.md";

describe("the clarification budget is countable", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article VI names a counting unit and a reset point`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### Counting unit (MUST)");
      expectPhrase(content, "**Five clarifying questions per skill invocation.**");
      expectPhrase(content, "starts at zero when the invocation starts");
      expectPhrase(content, "does **not** reset between stages");
      // Without this a delegating skill multiplies its own budget by fan-out.
      expectPhrase(content, "spends its caller's budget; it does not receive one of its own");
      expectPhrase(content, "One AskUserQuestion call is one question");
    });

    it(`${tree}: Article VI says what exhaustion does`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### Exhaustion (MUST)");
      // "Stop condition" must not be readable as "abort the run".
      expectPhrase(content, "Exhaustion stops the questions, not the work.");
      expectPhrase(content, "the agent enters `--auto`\nbehaviour");
      expectPhrase(content, "label every assumption in the outputs");
      expectPhrase(content, "Question budget is exhausted.");
    });

    it(`${tree}: Article VI decides whether approval questions count`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### What does not count (MUST)");
      expectPhrase(content, "**Approval questions are exempt.**");
      expectPhrase(content, "a per-row triage approval in `/qfai-sdd`");
      expectPhrase(content, "shared-skill-delegation-baseline.md#round-budget-must");
      expectPhrase(content, "MUST still be asked after the\n  budget is exhausted");
      expectPhrase(content, "Skipping a mandatory approval to stay under the budget\n  violates");
    });

    it(`${tree}: the shared baseline restates the budget for every skill`, async () => {
      const content = await read(tree, OPERATING);
      expectPhrase(content, "**at most 5 per skill invocation**");
      expectPhrase(content, "proceeds with labelled assumptions instead of asking");
      expectPhrase(content, "Mandatory approval questions are exempt");
      expectPhrase(content, "See `constitution.md` Article VI.");
    });

    it(`${tree}: qfai-sdd exempts its unbounded per-row approvals`, async () => {
      const content = await read(tree, SDD);
      expectPhrase(content, "exempt from\nthe Article VI clarification budget");
      expectPhrase(content, "MUST be asked however many rows triage\nproduced");
      expectPhrase(content, "`.qfai/assistant/constitution/constitution.md` Article VI");
    });

    it(`${tree}: qfai-configure declares its questions in-budget`, async () => {
      const content = await read(tree, CONFIGURE);
      expectPhrase(content, "count against the Article VI budget");
      expectPhrase(content, "at\nmost 5 per invocation of this skill");
      expectPhrase(content, "taken\nas labelled assumptions");
      expectPhrase(content, "`.qfai/assistant/constitution/constitution.md` Article VI");
    });
  }
});
