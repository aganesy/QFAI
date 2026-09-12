/**
 * The record an execution stage leaves of the sessions it held.
 *
 * A run that grilled and a run that skipped it leave the same spec, the same
 * ledger and the same code, so the record is the only thing that separates
 * them. What is pinned here is that the record exists, that its shape is the
 * one `/qfai-discussion` already writes, that it carries both times rather
 * than the ending alone, and that the stage's own gate is told to read it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const STAGES = ["qfai-implement", "qfai-atdd", "qfai-verify"];
const RULE_MASTERS = ["packages/qfai/assets/init/root/.agents/rules", ".agents/rules"];

/** The four the rule master names, in the order it names them. */
const ENDINGS = ["confirmed", "user-closed", "no-question", "stopped"];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

/** The body of a `## ` section, up to the next one. */
function section(document: string, heading: string): string {
  const start = document.indexOf(`\n${heading}\n`);
  if (start < 0) return "";
  const rest = document.slice(start + 1);
  const end = rest.indexOf("\n## ", 1);
  return end < 0 ? rest : rest.slice(0, end);
}

describe.each(RULE_MASTERS)("%s/grilling.md — the endings are a closed set", (dir) => {
  const master = (): Promise<string> => readFile(path.join(repoRoot, dir, "grilling.md"), "utf-8");

  it("names four, and says which of them lets the work go on", async () => {
    // A record naming an ending nobody defined is a record no gate can read.
    const text = await master();
    expectPhrase(text, "### The four endings");
    for (const ending of ENDINGS) {
      expectPhrase(text, `| \`${ending}\``);
    }
    expectPhrase(text, "**`stopped` is the one that does not let the work continue.**");
  });

  it("keeps `no-question` an ending rather than an exemption", async () => {
    // Completion needs a confirmation the mode forbids asking for. Without a
    // name for how such a run finishes, a session it was required to hold
    // could never end, and the rule would forbid the mode it describes.
    const text = await master();
    expectPhrase(text, "**`no-question` is an ending, not an exemption.**");
    expectPhrase(
      text,
      "What stops that run from being treated as agreed is the open questions it leaves",
    );
  });

  it("says a budget between agents is not a fifth ending", async () => {
    // The budget ends the rounds, not the session: the decisions still open go
    // to the user, who ends it in one of the four. Read the other way, an
    // escalating session would end itself and the user would never see them.
    const text = await master();
    expectPhrase(text, "**A session between agents reaches none of these on its own.**");
    expectPhrase(
      text,
      "every decision still open goes to the user, who ends it in one of the four",
    );
    expectPhrase(text, "never an ending of its own");
  });
});

describe.each(TREES)("%s — the execution stages record their sessions", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");
  const grilling = async (skill: string): Promise<string> =>
    section(await read(`assistant/skills/${skill}/SKILL.md`), "## Grilling (MANDATORY)");

  it("has the primitive point at the four rather than add its own", async () => {
    // Three skills defining endings is three vocabularies, and a gate reading
    // one of them passes a record written against another.
    const primitive = await read("assistant/skills/qfai-grilling/SKILL.md");
    expectPhrase(primitive, "**Those endings have names, and there are four of them.**");
    expectPhrase(primitive, "`.agents/rules/grilling.md` carries them under **The four endings**");
    expectPhrase(primitive, "this skill adds none of its own");
    expectPhrase(primitive, "the agent never confirms on the user's behalf");
  });

  it.each(STAGES)("%s carries the section and one row per session", async (skill) => {
    const body = await grilling(skill);
    expectPhrase(body, "**Record both sessions where the gate reads them.**");
    expectPhrase(body, "a run that grilled and a run that skipped it leave the same tree");
    expectPhrase(body, "`## Grilling Session`");
    expectPhrase(body, "section holding one row per session");
  });

  it.each(STAGES)("%s writes the shape the discussion stage already writes", async (skill) => {
    // A second shape for the same record is a second thing to learn and a
    // second thing to get wrong, and the reviewer reads both stages.
    const body = await grilling(skill);
    expectPhrase(
      body,
      "| Ended | Ended at | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |",
    );
    expectPhrase(body, "The shape `/qfai-discussion` already writes");
    expectPhrase(body, "this stage holds more than one session, so a row says which");
  });

  it.each(STAGES)("%s records both times, not the ending alone", async (skill) => {
    // A row holding only the ending is written at the end either way, so it
    // reads the same whether the session ran before the work or after it.
    const body = await grilling(skill);
    expectPhrase(body, "**Both times, and the second later than the first.**");
    expectPhrase(body, "because it is written at the end either way");
    expectPhrase(
      body,
      "It still cannot prove a session happened: the agent writes its own record.",
    );
  });

  it.each(STAGES)("%s names the four endings and what they authorize", async (skill) => {
    const body = await grilling(skill);
    for (const ending of ENDINGS) {
      expectPhrase(body, `\`${ending}\``);
    }
    expectPhrase(body, "the four endings `.agents/rules/grilling.md` names");
    expectPhrase(body, "only the first three let the work go on");
  });

  it.each(STAGES)("%s puts the open questions under the same table", async (skill) => {
    // The count and the questions it counts in two places is how they drift.
    const body = await grilling(skill);
    expectPhrase(body, "**The open questions go under that table, in the same section.**");
    expectPhrase(
      body,
      "the labelled assumption written in its place where a document required a value",
    );
    expectPhrase(body, "a reader finds the count and the questions it counts in one place");
  });

  it.each(STAGES)("%s tells its gate to read every row", async (skill) => {
    // Nothing else reads it. An unread record is a heading.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(
      body,
      "a row for the preflight session and one for every session detection opened",
    );
    expectPhrase(body, "every `Work resumed` is later than its own `Ended at` and inside this run");
    expectPhrase(body, "each row's `Open` count matches the questions listed under the table");
  });

  it.each(STAGES)("%s gives each ending a verdict at that gate", async (skill) => {
    // `user-closed` with open decisions passes and `no-question` with the same
    // count does not, so a gate reading the count alone gets both wrong.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(body, "**A `no-question` row with a non-zero `Open` is a `REVISE`.**");
    expectPhrase(body, "A `user-closed` row with open decisions **passes**");
    expectPhrase(body, "A `stopped` row is a `REVISE` whatever it counts");
  });
});
