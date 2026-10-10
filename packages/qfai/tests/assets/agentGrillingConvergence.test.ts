import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONVERGENCE = "assistant/rule/review-convergence.md";
const GRILLING = ".agents/rules/grilling.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe("a grilling session between agents has an end", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: names the session a delegated one, bounded by these rules`, async () => {
      // The session rule's own end condition needs a user's confirmation, and
      // no user answers a session between agents. These rules supply what ends
      // its rounds and what settles each decision when they run out.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "## Agent-to-agent grilling (MUST)");
      expectPhrase(content, "A grilling session between agents is a **delegated session**");
      expectPhrase(
        content,
        "the user is asked only an uncovered critical decision when questions are permitted",
      );
      expectPhrase(content, "record the agents' adoption and authority separately");
      expectPhrase(
        content,
        "These rules bound its rounds and say what\nsettles each decision when they run out.",
      );
    });

    it(`${tree}: bounds the rounds and settles every non-critical decision on the recommendation`, async () => {
      // Every non-critical decision, not only the open ones: partial agreement
      // is the ordinary outcome, and a decision left to "whatever the agents
      // agreed" would have no record of why it was taken.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "**Two rounds.**");
      expectPhrase(
        content,
        "**every\ndecision that is not critical takes the griller's recommendation**",
      );
      expectPhrase(content, "the ones\nthe agents agreed on and the ones still open alike");
      expectPhrase(content, "A third round is never\nstarted");
      // A disagreement is kept, not averaged, and the user sees every adopted
      // decision without being stopped for any.
      expectPhrase(
        content,
        "the recommendation is still taken, and each\nposition is recorded beside it with whose it is",
      );
      expectPhrase(
        content,
        "The stage reports every adopted\ndecision at its end without waiting for an answer",
      );
      expectPhrase(content, "overturns one through a change request or a rerun");
    });

    it(`${tree}: keeps an uncovered critical decision open without spending a round`, async () => {
      // More rounds cannot supply missing user authority. Uncovered critical
      // decisions remain open even when every agent agrees.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(
        content,
        "**A critical decision without an actual answer or recorded applicable user authority goes to the user at once when asking is permitted**",
      );
      expectPhrase(content, "without spending a round");
      expectPhrase(content, "Agent agreement and round exhaustion supply no authority");
      expectPhrase(content, "It contradicts a spec, a contract or a recorded decision");
      expectPhrase(content, "Its effect cannot be taken back");
      expectPhrase(
        content,
        "It rests on product or business intent that the request, the discussion pack, the specs and the contracts all leave unstated",
      );
      expectPhrase(content, "converge on the more fluent argument");
      // The discussion pack counts as an answer here: it is where the user
      // already answered product intent in a user session.
      expectPhrase(content, "A discussion pack answers product intent for this test.");
      expectPhrase(content, "Each uncovered critical decision goes to the user with every position");
      // The budget bounds the rounds, never the wait for the user's answer.
      expectPhrase(
        content,
        "**The budget does not end the session while a critical decision is open.**",
      );
      expectPhrase(
        content,
        "session ends `adopted` only with no open node or running lookup, all required consumed inputs present",
      );
      expectPhrase(
        content,
        "every critical decision supported by an actual user answer or recorded applicable authorization",
      );
    });

    it(`${tree}: sends a critical decision somewhere under a no-question mode`, async () => {
      // Escalation reaches nobody there, so it resolves the way Article X rule 6
      // resolves every unsettled decision: an open question the completion gate
      // reads, rather than a decision taken by default.
      const content = await read(path.join(tree, CONVERGENCE));
      expectPhrase(content, "Under a no-question mode no escalation is sent to the user");
      expectPhrase(content, "A critical decision without that authority is opened in the register");
      expectPhrase(content, "so the stage cannot complete over it");
      expectPhrase(content, "Article X,\nrule 6");
      // And the session still ends: the register write is its ending there.
      expectPhrase(content, "that write ends the session `no-question`");
      expectPhrase(
        content,
        "Non-critical decisions are adopted as they are in any delegated session.",
      );
      expectPhrase(content, "no-question mode alone does not qualify it");
      expectPhrase(
        content,
        "Unknown facts and missing undefaultable consumed inputs retain the ordinary open/stop behavior",
      );
    });
  }

  it.each([GRILLING, "packages/qfai/assets/init/root/.agents/rules/grilling.md"])(
    "%s states the end condition these rules stand in for, and how a delegated session ends",
    async (rel) => {
      // Two halves. If the rule stopped requiring the user's confirmation, the
      // convergence rules would answer a problem that no longer exists and
      // nothing would notice. And the master has to name the ending a session
      // between agents reaches, because a rule listing every ending, beside a
      // rule ending one at a count, is two mandatory instructions an agent has
      // to choose between.
      //
      // What it says is that the budget bounds the rounds and the session ends
      // `adopted` only once every critical decision has actual user authority.
      const content = await read(rel);
      expectPhrase(content, "The user confirms the understanding is shared.");
      expectPhrase(content, "### A session between agents");
      expectPhrase(
        content,
        "**A session between agents is a delegated session, and ends `adopted`.**",
      );
      expectPhrase(content, "The count bounds the rounds between agents.");
      expectPhrase(
        content,
        "It does not end the session while a critical decision is unanswered and lacks an applicable recorded authorization.",
      );
      expectPhrase(content, "review-convergence.md");
    },
  );
});
