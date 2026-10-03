/**
 * The boundary between what `/qfai-prototyping` grills and what it prototypes.
 *
 * Both halves are pinned, because getting either wrong is expensive in a
 * different way. Prototyping a question a sentence would have settled spends
 * cycles building an answer nobody needed; grilling a question that needs
 * something to react to spends a whole session on rephrasing.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skill/qfai-prototyping/SKILL.md";
const GRILL = "assistant/step/prototyping-grill/STEP.md";
const LOOP = "assistant/step/prototyping-loop/STEP.md";
const RECOVER = "assistant/step/prototyping-recover/STEP.md";
const RULE = ".agents/rules/grilling.md";
const GENERATOR_PROMPT = "assistant/skill/qfai-prototyping/references/generator-prompt.md";
const REVIEWER_PROMPT = "assistant/skill/qfai-prototyping/references/reviewer-prompt.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

/** The boundary table's rows as trimmed cells, heading row first, separator dropped. */
function boundaryTable(skill: string): string[][] {
  const section = /## What is grilled, and what is prototyped([\s\S]*?)^## /m.exec(skill);
  expect(section, "the boundary section is gone").not.toBeNull();
  return (section?.[1] ?? "")
    .split("\n")
    .map((line) => line.replace("\r", ""))
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^-+$/.test(cell)));
}

/** The `ask-user` bucket's entries, unwrapped. */
function askUserBucket(skill: string): string {
  const block = new RegExp(
    "- ask-user:" + "\\n" + "([" + "\\s\\S" + "]*?)" + "\\n" + "(?:- |\\n)",
  ).exec(skill);
  expect(block, "the ask-user bucket is gone").not.toBeNull();
  return unwrap(block?.[1] ?? "");
}

describe.each(TREES)("%s — prototyping and grilling", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");

  it("puts each question on its own side of the table", async () => {
    // A skill that named only what it prototypes leaves the other half to
    // whoever reads it, and the reading that costs least effort is "prototype
    // everything" — which is the loop answering by building.
    //
    // The cells are read per row rather than searched for in the file: an edit
    // that moved a question across the table, or swapped the headings, would
    // leave every phrase present and the boundary reversed.
    const skill = await read(GRILL);
    expectPhrase(skill, "## What is grilled, and what is prototyped");

    const rows = boundaryTable(skill);
    // The right heading says the loop makes these answerable, not that it
    // settles them: the checkpoint after each review returns exactly these
    // decisions to the user, so a heading claiming the loop settled them
    // licenses the agent-owned decision the workflow then forbids.
    expect(rows[0], "the heading row is gone or reworded").toEqual([
      "Settled by talking, before the loop",
      "Made answerable by the loop, settled by the user against it",
    ]);
    const grilled = rows.slice(1).map((row) => row[0]);
    const prototyped = rows.slice(1).map((row) => row[1]);

    for (const question of [
      "What the prototype is for",
      "What would count as better",
      "What is out of bounds",
    ]) {
      expect(grilled, `${question} left the talking column`).toContain(question);
      expect(prototyped, `${question} reached the loop column`).not.toContain(question);
    }
    for (const question of ["How it should feel", "Which layout carries the task"]) {
      expect(prototyped, `${question} left the loop column`).toContain(question);
      expect(grilled, `${question} reached the talking column`).not.toContain(question);
    }
  });

  it("blocks handoff on the session, not on one answer", async () => {
    // A reviewed prototype can make several decisions answerable at once. The
    // method ends a delegated session when no node is open and every critical
    // decision has the user's answer, so reducing the checkpoint to one
    // question would route to handoff with the rest open.
    const skill = await read(LOOP);
    expectPhrase(skill, "**Resume the session against the reviewed prototype**");
    expectPhrase(
      skill,
      "the reaction and everything it raises are a new frontier, not one question",
    );
    expectPhrase(skill, "The step passes when the user confirmed the prototype.");
    // And the no-question route stops rather than handing off an unpicked design.
    expectPhrase(skill, "A reviewer's scores are not the user's confirmation.");
  });

  it("sends a rejected choice back through another iteration", async () => {
    // Recording the answer does not change the HTML. Treating any answer as
    // sufficient would copy the unchanged iteration to `final` and hand off the
    // design the user just turned down.
    const skill = await read(LOOP);
    expectPhrase(skill, "**Confirmed** — the user says the prototype is done — goes to");
    expectPhrase(
      skill,
      "**A change** — the user asks for something this lineage can take — runs the next iteration, carrying their answer as the pivot.",
    );
    expectPhrase(
      skill,
      "**A different design** — a direction this lineage does not implement — runs `prototyping-recover`.",
    );
    // A `stop` is not a rejection: it ends the run.
    expectPhrase(skill, "**Stopped** — the user said `stop` — ends the run there");
    // `proceed` / `done` close the asking but cannot assume the one answer the
    // loop exists to obtain.
    expectPhrase(skill, "**Closed** — `proceed` or `done` without an answer to this question");
    expectPhrase(skill, "It is what the loop exists to answer, so a closure cannot assume it.");
  });

  it("carries the session's answers into the loop", async () => {
    // The generator runs from contracts and a fixed prompt, the reviewer from
    // four fixed axes. Neither says anything about this prototype's purpose, so
    // answers with no destination are answers the loop cannot read — and it
    // will contradict them on the next cycle.
    const skill = await read(GRILL);
    expectPhrase(skill, "`.qfai/prototype/grilling.md`");
    expectPhrase(skill, "under `## Session` for the decisions");
    // Only a critical decision waits on the user; the rest are adopted and
    // recorded under `## Session` with the agent that recommended them.
    expectPhrase(skill, "`## Escalated` for a critical decision the user has yet to settle");
    expectPhrase(skill, "an adopted one names the agent that recommended it and why it was taken");
    // An answered escalation leaves the open section, or the same decision
    // reads as settled and open at once — and the delegated prompts consume
    // every matching row.
    const loop = await read(LOOP);
    expectPhrase(
      loop,
      "**replacing any row with the same `Scope` and decision rather than adding beside it",
    );
    expectPhrase(loop, "removing its row from `## Escalated`**");
    expectPhrase(loop, "the current state of the tree, not its history");
    // Both consumers, named where each lists its inputs.
    const evaluator = /## Evaluator Inputs \(Mandatory\)([\s\S]*?)^## /m.exec(loop)?.[1] ?? "";
    expect(unwrap(evaluator)).toContain(".qfai/prototype/grilling.md");
    expect(unwrap(loop)).toContain("Reads the contracts, `.qfai/prototype/grilling.md`");
  });

  it("says what each mistake costs", async () => {
    // The boundary is a judgement call at the edges, so the skill gives the
    // reader the cost of each error rather than a list to match against.
    const skill = await read(GRILL);
    expectPhrase(skill, "building is the expensive way to learn something a sentence would have");
    expectPhrase(skill, "it costs a session rather than an iteration");
  });

  it("keeps the decision with the user after the prototype exists", async () => {
    // The failure this stops is the one the rule spends every round avoiding,
    // and a prototype makes it easier rather than harder: the agent now has
    // evidence, which is exactly what makes deciding alone feel justified.
    const skill = await read(GRILL);
    expectPhrase(skill, "**The prototype makes a decision answerable; it does not take it.**");
    expectPhrase(skill, "ask the question again against it");
    expectPhrase(skill, "with more evidence than before, and still not the user's answer");
  });

  it("leaves the scope floor where it was", async () => {
    // Which specs the loop covers is decided elsewhere. A session that could
    // narrow it would turn a coverage rule into a conversation.
    const skill = await read(GRILL);
    expectPhrase(skill, "The scope floor is unchanged");
    expectPhrase(skill, "no session narrows it");
  });

  it("leaves the session's decisions to the session's own policy", async () => {
    // The buckets classify the operations this skill performs. A frontier
    // decision is the session's, and listing it here would let an orchestrator
    // treat an open-ended session as part of this section's 0-1 prompt policy
    // instead of running it to its own end condition.
    const askUser = askUserBucket(await read(SKILL));
    expect(askUser).toContain("whether a reviewed prototype is done");
    expect(askUser).not.toContain("what the prototype is for");
    expectPhrase(
      await read(GRILL),
      "the session's own decisions are classified there rather than in this skill's buckets",
    );
  });

  it("grills only what the frozen inputs leave open", async () => {
    // The specs, the UI contracts and DESIGN.md answer some of these already,
    // and the method reads a fact rather than asking about it. A session that
    // re-opens a frozen requirement produces an answer that drifts from it.
    const skill = await read(GRILL);
    expectPhrase(skill, "**Only what the inputs leave open.**");
    expectPhrase(skill, "a question they answer is not on the frontier");
    expectPhrase(skill, "produces an answer that drifts from it");
  });

  it("scopes every row to the lineage it applies to", async () => {
    // One invocation runs a lineage per UI contract and screen, so a record with no
    // key applies every answer to each of them. `global` is written rather
    // than inferred from a missing key, because a missing key is also what an
    // unscoped row looks like.
    const skill = await read(GRILL);
    expectPhrase(skill, "**Every row names what it applies to**");
    expectPhrase(skill, "`<ui-contract-id>/<screen>`");
    expectPhrase(skill, "`global` is a real answer and not a default");
    expectPhrase(
      skill,
      "reads the rows matching its own lineage plus the `global` ones, and nothing else",
    );
  });

  it("writes the record before the loop reads it", async () => {
    // On a fresh project nothing ships one and the session produces no artifact
    // of its own, so a required input the delegated role cannot find is an error
    // it has to guess past — which is what the record exists to stop.
    const skill = await read(GRILL);
    expectPhrase(
      skill,
      "**The file is written before the first iteration, empty session or not.**",
    );
    expectPhrase(skill, "a different statement from a file that is not there");
  });

  it("keeps the record for the loop, locally", async () => {
    // A run log is regenerable. These answers are not: nothing reproduces them,
    // and every later generator and reviewer must read them, so the record
    // stays in place until the handoff.
    const skill = await read(GRILL);
    expectPhrase(skill, "**It is a decision record, not a regenerable log.**");
    expectPhrase(skill, "A run log is reproducible by rerunning its stage");
    expectPhrase(skill, "Keep the file in place until the handoff.");
    expectPhrase(skill, "no `qfai` command reads it");
  });

  it("hands the record to the delegated roles, not only to this skill", async () => {
    // The generator and the reviewer run from injected contracts. A record
    // named only in the parent skill is one the roles that build and grade the
    // prototype never read.
    const generator = await read(GENERATOR_PROMPT);
    expectPhrase(generator, "`.qfai/prototype/grilling.md`");
    expectPhrase(generator, "Every iteration, not only the first");

    const reviewer = await read(REVIEWER_PROMPT);
    expectPhrase(reviewer, "Session record: `.qfai/prototype/grilling.md`");
    expectPhrase(reviewer, "grades every prototype against the same generic bar");

    // Both carry the lineage filter, or another screen's answer constrains this
    // one — the scoping in the parent skill does not reach an injected prompt.
    for (const prompt of [generator, reviewer]) {
      expect(unwrap(prompt)).toContain("plus the `global` ones, and no others");
    }
  });

  it("reads the primitive's body before either session", async () => {
    // A host that loads skill bodies lazily hands the agent the skill's name
    // and not its procedure, and an agent with the name alone improvises an
    // interview that reads exactly like the method.
    const grill = await read(GRILL);
    expectPhrase(grill, "Read\n`.qfai/assistant/skill/qfai-grilling/SKILL.md` before starting");
    expectPhrase(grill, "It is the single implementation");
    // In the read order too, since that is where an agent looks for what to
    // open before it starts.
    const inputs = /## Inputs Priority[\s\S]*?\n## /.exec(await read(SKILL));
    expect(inputs, "the read order is gone").not.toBeNull();
    expect(unwrap(inputs?.[0] ?? "")).toContain(
      "`.qfai/assistant/skill/qfai-grilling/SKILL.md` before either session",
    );
  });

  it("stops before the loop on a left-column decision nobody answered", async () => {
    // Under a no-question mode the session records those open and nobody
    // answers them. Starting the loop there spends the whole cycle budget
    // building against nothing, and the reviewer prompt says in its own words
    // what it does without the record.
    const skill = await read(GRILL);
    expectPhrase(
      skill,
      "**A left-column decision still under `## Escalated` stops the run before the first iteration.**",
    );
    expectPhrase(skill, "Report the open rows and stop");
    // Scoped to the left column, or the gate blocks on the questions the loop
    // exists to make answerable — which are open by design until then.
    expectPhrase(skill, "The right column is not this gate's subject");
  });

  it("asks before a new lineage replaces the earlier iterations", async () => {
    // A new lineage overwrites `iter-00/` and replaces every later iteration,
    // and a destructive operation is approved on what its confirmation says.
    const skill = await read(RECOVER);
    expectPhrase(skill, "**Ask before starting over.**");
    expectPhrase(
      skill,
      "A new lineage overwrites `iter-00/` and replaces every later iteration and its reviews.",
    );
    // And a refusal has an outcome of its own, so the orchestrator is not left
    // with no next step but the operation the user just refused.
    expectPhrase(skill, "**A declined restart ends the run and deletes nothing.**");
    expectPhrase(skill, "leave `.qfai/prototype/` as it stands, and stop");
  });

  it("tells the delegated roles an escalated row is not a constraint", async () => {
    // Both prompts read every row matching their lineage. Read as settled, an
    // open row decides on the user's behalf the one kind of question the loop
    // exists to return to them.
    const generator = await read(GENERATOR_PROMPT);
    expectPhrase(generator, "`## Session` rows are constraints; `## Escalated` rows are not.");
    expectPhrase(generator, "Build something that\n   makes it answerable and leave it open");

    const reviewer = await read(REVIEWER_PROMPT);
    expectPhrase(reviewer, "Grade against `## Session` only.");
    expectPhrase(reviewer, "a bar that was never set");
  });

  it("agrees with the rule master it points at", async () => {
    // The rule states the same boundary from its side. If one moved without
    // the other, an agent would be told to grill and not to grill the same
    // question, which is worse than either instruction alone.
    const skill = await read(GRILL);
    expectPhrase(skill, ".agents/rules/grilling.md");

    const rule = await readFile(path.join(repoRoot, RULE), "utf-8");
    expectPhrase(rule, "## What talking cannot settle");
    expectPhrase(rule, "Stop grilling and build the throwaway version.");
    expectPhrase(rule, "it does not transfer the decision");
    // Both name the same pair of examples, which is what makes the boundary
    // legible rather than a category an agent has to intuit.
    for (const example of ["How should this feel", "one long form or three pages"]) {
      expectPhrase(rule, example);
    }
    expectPhrase(skill, "How should this\nfeel");
  });
});
