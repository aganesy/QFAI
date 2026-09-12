import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file rather than to `process.cwd()`, for the reason the
// clarification-budget suite gives: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, DELEGATION), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe("a griller's recommendations and reviewer independence", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the split turns on who settled the decision`, async () => {
      // A recommendation the user chose from is one input among several, and the
      // decision is theirs. One an agent adopted with nobody adjudicating became
      // the artifact, and reviewing it is reviewing your own proposal.
      const content = await read(tree);
      expectPhrase(content, "#### A griller's recommendations, and what they disqualify");
      expectPhrase(content, "By the user, from the recommendation among the inputs");
      expectPhrase(content, "Agent to agent, the recommendation adopted with no user adjudication");
    });

    it(`${tree}: names correlation rather than memory as the risk`, async () => {
      // Written down because the intuitive objection — a reset context cannot
      // remember, so it cannot defer — is true and does not reach the problem. A
      // fresh instance of the same agent re-derives the same preference from the
      // same evidence, and finds its own recommendation good on the merits.
      const content = await read(tree);
      expectPhrase(content, "The reason is not memory.");
      expectPhrase(content, "The risk is **correlation**");
      expectPhrase(content, "removes the memory, not the disposition");
    });

    it(`${tree}: keeps the split inside the independence rule`, async () => {
      // Framed as an exception it would sit beside the rule and could be read as
      // outranking it. As a case, the existing obligation carries it: declare the
      // conflict and hand those items on.
      const content = await read(tree);
      expectPhrase(content, "This is a case of the rule above, not an exception to it.");
      expectPhrase(content, "hand those items to a non-participating reviewer");
    });

    it(`${tree}: refuses to make each review round a new reviewer`, async () => {
      // The budget is two rounds per reviewer per artifact. Counting each round
      // as a different reviewer resets that counter every round, so it never
      // empties — and the escalation exit that opens when it does never opens.
      const content = await read(tree);
      expectPhrase(content, "Round 1 and round 2 of a review stay one reviewer with one budget.");
      expectPhrase(content, "the two-round budget could never be exhausted");
    });
  }
});
