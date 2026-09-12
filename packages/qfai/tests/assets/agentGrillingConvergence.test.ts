import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONVERGENCE = "assistant/constitution/review-convergence.md";
const GRILLING = ".agents/rules/grilling.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe("a grilling session between agents has an end", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: names why the session rule's own end condition is unreachable`, async () => {
      // The session ends on an empty frontier and the user's confirmation. With
      // no user answering, neither half arrives, so a loop between two agents
      // would run until something else stopped it.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "### Agent-to-agent grilling (MUST)");
      expectPhrase(content, "cannot be reached from inside it");
    });

    it(`${tree}: bounds the rounds and keeps escalation a normal outcome`, async () => {
      // Same budget a reviewer has, so the two compose rather than competing.
      // Escalation has to read as an outcome, or an agent facing it will spend
      // another round instead.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "**Two rounds**, the same budget a reviewer has.");
      expectPhrase(content, "Escalating is not failure");
    });

    it(`${tree}: escalates three subjects without spending a round`, async () => {
      // Each is a decision the repository does not hold the answer to, so more
      // rounds produce agreement rather than an answer — and agreement between
      // two agents is the failure that is hardest to see afterwards.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "**Three subjects escalate at once**, without spending a round");
      expectPhrase(content, "Product or business intent");
      expectPhrase(content, "contradicts a spec, a contract or a recorded decision");
      expectPhrase(content, "no evidence in the specs, the contracts or the discussion pack");
      expectPhrase(content, "converge on the more fluent argument");
    });

    it(`${tree}: sends the escalation somewhere under a no-question mode`, async () => {
      // Escalation reaches nobody there, so it resolves the way Article X rule 6
      // resolves every unsettled decision: an open question the completion gate
      // reads, rather than a decision taken by default.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "the escalation has nobody to reach");
      expectPhrase(content, "so the stage cannot\ncomplete over it");
      expectPhrase(content, "Article X,\nrule 6");
    });
  }

  it("the session rule states the end condition these rules stand in for", async () => {
    // If the rule stopped requiring the user's confirmation, the convergence
    // rules above would be answering a problem that no longer exists, and
    // nothing else would notice.
    const content = await read(GRILLING);
    expectPhrase(content, "The user confirms the understanding is shared.");
  });
});
