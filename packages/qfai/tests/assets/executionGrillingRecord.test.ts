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
    // The working-when checklist cannot require a confirmation three of the
    // four endings are reached without.
    expectPhrase(text, "The session reached one of the four endings on purpose.");
    expectPhrase(text, "a run that could not have asked is not failing this list by not asking");
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
    // The budget ends the rounds, not the session: every decision the user has
    // not settled goes to them, and they end it in one of the four. Read the
    // other way, an escalating session would end itself and the user would
    // never see them. "Not settled" and not "still open": a decision the agents
    // agreed on is still one nobody took.
    const text = await master();
    expectPhrase(text, "**A session between agents reaches none of these on its own.**");
    expectPhrase(text, "every decision the user has not\nsettled goes to the user");
    expectPhrase(text, "because agreement between agents settles nothing");
    expectPhrase(text, "the user ends the\nsession in one of the four");
    expectPhrase(text, "never an ending of its own");
    // Under a no-question mode nothing reaches the user, so without this the
    // session would have no ending it could reach.
    expectPhrase(text, "**Under a no-question mode there is nobody to send them to**");
    expectPhrase(text, "that register write ends the session `no-question`");
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

  it("gives each stage one grilling section rather than two", async () => {
    // Two sections defining the same record is two contracts, and a run
    // compliant with either fails the other. `## Grilling Session` is not one
    // of them: that is the evidence heading, quoted inside a template block.
    const HEADINGS = ["## Grilling", "## Grilling (MANDATORY)"];
    for (const skill of STAGES) {
      const body = await read(`assistant/skills/${skill}/SKILL.md`);
      const declared = body.split("\n").filter((line) => HEADINGS.includes(line.trimEnd()));
      expect(declared, `${skill} declares ${declared.length} grilling sections`).toHaveLength(1);
    }
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
      "| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |",
    );
    // The confidence check may open no preflight session at all, and an absent
    // row reads the same as a skipped one without a line saying which.
    expectPhrase(body, "run started 2026-01-01T09:02:00.417Z");
    // A retry shares a second with the run before it.
    expectPhrase(body, "**To the millisecond, because a retry is immediate.**");
    expectPhrase(body, "Preflight: session opened");
    expectPhrase(body, "**`Preflight` says whether the confidence check opened a session.**");
    expectPhrase(body, "The shape `/qfai-discussion` already writes");
    expectPhrase(body, "this stage holds more than one session, so a row says which");
  });

  it.each(STAGES)("%s bounds the row to this run as well as this order", async (skill) => {
    // A row holding only the ending is written at the end either way, so it
    // reads the same whether the session ran before the work or after it.
    const body = await grilling(skill);
    expectPhrase(body, "**Both times, and the second later than the first.**");
    expectPhrase(body, "because it is written at the end either way");
    expectPhrase(
      body,
      "It still cannot prove a session happened: the agent writes its own record.",
    );
    // The times order a session against the work and bound no invocation: an
    // evidence file is updated in place, so last week's row reads as valid.
    expectPhrase(body, "is what bounds the invocation, and it is one block per stage-invocation");
    // Two stages share an evidence file, so one table would have each gate
    // rejecting the other stage's rows.
    expectPhrase(body, "**One block per stage as well as per run**");
    // An artifact cannot prove its own freshness: the value that settles it
    // arrives in the reviewer work order.
    expectPhrase(
      body,
      "**The run's start goes to the reviewer in its work order, not only into the",
    );
    expectPhrase(body, "a rerun that wrote no block leaves an earlier one internally consistent");
    expectPhrase(body, "the one value that settles it has to arrive from outside the artifact");
    expectPhrase(body, "The gate reads this stage's own block and leaves every other block alone");
    expectPhrase(
      body,
      "a rerun over an unchanged tree produces the same `Revision`, because that address is a tree address and excludes `.qfai/evidence/**`",
    );
    expectPhrase(body, "`Revision` stays beside it");
  });

  it.each(STAGES)("%s names the four endings and what they authorize", async (skill) => {
    const body = await grilling(skill);
    for (const ending of ENDINGS) {
      expectPhrase(body, `\`${ending}\``);
    }
    expectPhrase(body, "the four endings `.agents/rules/grilling.md` names");
    expectPhrase(body, "only the first three let the work go on");
    expectPhrase(body, "**The closing answer goes under that table too**");
    expectPhrase(
      body,
      "**and a decision still waiting is an open line under that `Session` as well**",
    );
    expectPhrase(body, 'Closed S2: "proceed"');
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
    // A register of decisions alone lets one unanswered user-held fact through.
    expectPhrase(body, "**Nodes, not decisions.**");
    expectPhrase(body, "`Open` counts the lines.");
    // Two rows at `Open = 1` and an unkeyed register: one question satisfies both.
    expectPhrase(body, "**And each line names its session by `Session`**");
    // `Subject` is not unique: a recurring obstacle reopens under one description.
    expectPhrase(body, "a recurring obstacle reopens a session under the same description");
  });

  it("sends an implement run's record to every file its rows own", async () => {
    // An `E2E` / `API` / `Integration` row's evidence is `atdd-<spec-id>.md`, so
    // a record always written here leaves that row's reviewer without one.
    const body = await grilling("qfai-implement");
    expectPhrase(body, "The record goes in **every evidence file this invocation's rows own**");
    expectPhrase(body, "by the rule gate item 10 uses");
    // One pass may hold a Unit row and an E2E row, read by two reviewers
    // opening two files.
    expectPhrase(
      body,
      "**Every one, because one invocation may process rows with different owners.**",
    );
    expectPhrase(body, "identical heading, identical rows, written in the same edit");
  });

  it.each(STAGES)("%s tells its gate to read every row", async (skill) => {
    // Nothing else reads it. An unread record is a heading.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(body, "`Preflight`, a row for every session detection opened");
    expectPhrase(body, "block whose time equals the one this run's work order states");
    expectPhrase(
      body,
      "every row`s `Ended at` is at or after the run-started time".replace("row`s", "row's"),
    );
    expectPhrase(
      body,
      "each row's `Open` count matches the register lines naming that row's `Session`",
    );
    // The ordering both times exist for is checked, not just recorded.
    expectPhrase(
      body,
      "and after which the stage wrote, carries a `Work resumed` later than its own `Ended at`",
    );
    expectPhrase(body, "**A run that did not resume writes `none — <why>` instead**");
    // An unanswered escalation is a decision nobody took, so an ended row keeps
    // it in the register.
    expectPhrase(body, "**An escalation line still waiting on an answer is an open node**");
    expectPhrase(body, "which the gate accepts on those three endings and on no other");
    expectPhrase(body, "A blank is neither, and is a `REVISE` — **except on a `stopped` row**");
    // The field that says which tree the session ended against is validated,
    // not only required by the record.
    expectPhrase(body, "**Every row's `Revision` is a git rev or `working-tree+<hash>`**");
  });

  it.each(STAGES)("%s gives each ending a verdict at that gate", async (skill) => {
    // `user-closed` with open decisions passes and `no-question` with the same
    // count does not, so a gate reading the count alone gets both wrong.
    const body = await read(`assistant/skills/${skill}/SKILL.md`);
    expectPhrase(body, "**Each ending carries its own condition, and the name alone is not one.**");
    // One predicate per ending: an enum check passes a row that claims an
    // ending whose own condition it does not meet.
    expectPhrase(
      body,
      "`Frontier` empty, `Lookups` none in flight, `Open` 0, **and the confirming answer quoted under the table beside that row`s `Session`**".replace(
        "row`s",
        "row's",
      ),
    );
    // Tree state is the first of two completing conditions.
    expectPhrase(body, "a session that closed its own tree and never asked satisfies every count");
    expectPhrase(
      body,
      "`Lookups` none in flight, every open node assumable, **and every one of them carrying its labelled assumption in the register**",
    );
    // The closure covers the tree as it finally stands, so a running lookup
    // can raise a node after it.
    expectPhrase(body, "a lookup still running can raise a node after it");
    // `user-closed` is the user's act as much as `confirmed` is, so a register
    // of assumptions alone does not show it happened.
    expectPhrase(
      body,
      "**and the closing answer quoted under the table beside that row's `Session`**",
    );
    expectPhrase(body, "`Lookups` none in flight and `Open` 0. Article X, rule 6");
    expectPhrase(body, "`Work resumed` empty. The user ended the session");
    // A row is a file change, and a stop forbids one.
    expectPhrase(body, "**A stopped session is reported, not written.**");
    expectPhrase(body, "the alternative is an instruction to edit a file the user just stopped");
  });
});
