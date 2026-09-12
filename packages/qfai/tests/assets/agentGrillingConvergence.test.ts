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
      // Every decision still open, not "the round settled nothing". Partial
      // progress is the ordinary outcome, so that condition would be false
      // almost always and leave the rest of the frontier to an unauthorised
      // third round.
      expectPhrase(content, "**Every decision still open after the second round escalates**");
      expectPhrase(content, "whether or not that round settled others");
      expectPhrase(content, "Escalating is not failure");
    });

    it(`${tree}: escalates three subjects without spending a round`, async () => {
      // Each is a decision the repository does not hold the answer to, so more
      // rounds produce agreement rather than an answer — and agreement between
      // two agents is the failure that is hardest to see afterwards.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "**Three subjects escalate at once**, without spending a round");
      // The predicate is authoritative evidence. Escalating product intent a
      // spec already answers blocks a fully specified run for nothing, and
      // counting a discussion pack as evidence lets two agents settle on
      // discovery material the drift protocol calls non-normative.
      expectPhrase(content, "The test in each is authoritative evidence");
      expectPhrase(content, "A discussion pack is not among them");
      expectPhrase(content, "No authoritative artifact answers it");
      expectPhrase(content, "contradicting a spec, a contract or a recorded decision");
      expectPhrase(content, "resting on nothing authoritative");
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

  it.each([GRILLING, "packages/qfai/assets/init/root/.agents/rules/grilling.md"])(
    "%s states the end condition these rules stand in for, and the exception",
    async (rel) => {
      // Two halves. If the rule stopped requiring the user's confirmation, the
      // convergence rules would answer a problem that no longer exists and
      // nothing would notice. And a rule saying a session never ends on a count,
      // beside a rule ending one at two rounds, is two mandatory instructions an
      // agent has to choose between — so the master carries the exception.
      const content = await read(rel);
      expectPhrase(content, "The user confirms the understanding is shared.");
      expectPhrase(content, "### A session between agents");
      expectPhrase(content, "the one place a session ends on a count");
      expectPhrase(content, "review-convergence.md");
    },
  );
});
