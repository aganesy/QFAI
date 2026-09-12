/**
 * The two sessions the execution stages run.
 *
 * These stages take a spec and a test ledger as settled input, so the risk runs
 * both ways: without a session they decide alone what the spec left open, and
 * with an unbounded one they re-open a design every run and stop the
 * micro-cycle. Each assertion pins one side of that bound, or one of the two
 * places the answer to "what happens next" is not the Drift Protocol's.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CONSTITUTION = "assistant/constitution/constitution.md";
const STAGES = ["qfai-implement", "qfai-atdd", "qfai-verify"];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — grilling in the execution stages", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");
  const article = async (): Promise<string> => {
    const text = await read(CONSTITUTION);
    const section = /## Article IX([\s\S]*?)^## Article X/m.exec(text);
    expect(section, "Article IX is gone or renamed").not.toBeNull();
    return section?.[1] ?? "";
  };

  it("declares a session, not a question outside one", async () => {
    // The rule master admits nothing into a session by accident: one is entered
    // deliberately, and a question outside one is an ordinary clarification
    // capped by Article VI. A cap on the question that would have prevented the
    // wrong build is the failure this gate exists to catch.
    const text = await article();
    expectPhrase(text, '**"Targeted questions" means a grilling session**');
    expectPhrase(text, "a session is entered deliberately, and this is the deliberate entry");
    expectPhrase(text, "Not an ordinary clarification");
    expectPhrase(text, ".agents/rules/grilling.md");
  });

  it("bounds the subject rather than the length", async () => {
    // Re-interrogating a settled spec and ledger every run would stop the
    // micro-cycle. Bounding the rounds instead would cut a session off with its
    // frontier still open, which is what the method exists to prevent.
    const text = await article();
    expectPhrase(text, "**Its subject is bounded, not its length.**");
    expectPhrase(text, "what the preflight left uncertain, and nothing else");
    expectPhrase(
      text,
      "would stop the micro-cycle and invite the drift these stages exist to avoid",
    );
    expectPhrase(text, "runs until its frontier is empty, however few rounds that takes");
  });

  it("opens a session on detection too", async () => {
    // The case this effort exists for: an implement or atdd run reads a spec
    // closely enough for its gaps to show, and the agent that finds one is the
    // least able to judge alone what the spec ought to say.
    const text = await article();
    expectPhrase(text, "**A session also opens on detection.**");
    expectPhrase(text, "stop and grill rather than deciding alone");
    expectPhrase(text, "read a spec closely enough for its gaps to show");
    expectPhrase(text, "Its subject is what was detected.");
  });

  it("sends only an upstream change through the Drift Protocol", async () => {
    // Not every detection is drift. A dependency that is unavailable, or an
    // approach that failed, is this run's to solve, and routing it through an
    // approval blocks the run on a decision nobody upstream has to make.
    const text = await article();
    expectPhrase(text, "only one branch is the Drift Protocol's");
    expectPhrase(text, "Settled input must change");
    expectPhrase(text, "stop the dependent work, raise the Change Request, wait for approval");
    expectPhrase(
      text,
      "The run solves it. Nothing upstream changes, so there is nothing to approve",
    );
  });

  it("gives each drift class what that class asks for", async () => {
    // Intent drift takes options and a recommendation. Defect drift has one
    // correct repair and the protocol records `Approved option: -`, so options
    // there would be invented alternatives dressed as a choice.
    const text = await article();
    expectPhrase(text, "for\nintent drift, the options and the recommendation");
    expectPhrase(text, "for defect drift, the single correct repair");
    expectPhrase(text, "`Approved option: -`");
    expectPhrase(
      text,
      "Grilling decides what the change should be; the protocol decides whether it happens",
    );
  });

  it.each(STAGES)("%s cites the article rather than restating it", async (skill) => {
    // Three skills carrying three copies of one rule is three chances to drift,
    // and the drift surfaces as three agents behaving differently at the same
    // moment.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(body, "## Grilling (MANDATORY)");
    expectPhrase(body, "Article IX of `.qfai/assistant/constitution/constitution.md` owns both");
    expectPhrase(body, "Neither is restated here.");
    // The three obligations, named where an operator reads the skill.
    expectPhrase(body, "**At the preflight.**");
    expectPhrase(body, "**On detection.**");
    expectPhrase(body, "**Neither session changes settled input.**");
    // Including the branch that is not the protocol's.
    expectPhrase(body, "the run solves it");
  });

  it.each(STAGES)("%s does not restate the method", async (skill) => {
    // The rule's parts qualify each other, so a partial copy states the
    // opposite of what the rule says.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    for (const mechanic of [
      /the whole frontier at once/i,
      /each question numbered/i,
      /empty frontier/i,
    ]) {
      expect(unwrap(body), `${skill} restates the method: ${String(mechanic)}`).not.toMatch(
        mechanic,
      );
    }
  });
});
