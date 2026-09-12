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

import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-prototyping/SKILL.md";
const RULE = ".agents/rules/grilling.md";
const GENERATOR_PROMPT = "assistant/skills/qfai-prototyping/references/generator-prompt.md";
const REVIEWER_PROMPT = "assistant/skills/qfai-prototyping/references/reviewer-prompt.md";

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
    "- ask-user:" + "\\n" + "([" + "\\s\\S" + "]*?)" + "\\n" + "- hard-required:",
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
    const skill = await read(SKILL);
    expectPhrase(skill, "## What is grilled, and what is prototyped");

    const rows = boundaryTable(skill);
    // The right heading says the loop makes these answerable, not that it
    // settles them: the checkpoint after convergence returns exactly these
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
    // Convergence is the reviewer's verdict on four fixed axes, and it can
    // make several decisions answerable at once. The method ends a session on
    // an empty frontier and the user's confirmation, so reducing the
    // checkpoint to one question would route to handoff with the rest open.
    const skill = await read(SKILL);
    expectPhrase(skill, "**Resume the session against the converged prototype**");
    expectPhrase(
      skill,
      "the reaction and everything it raises are a new frontier, not one question",
    );
    expectPhrase(
      skill,
      "Blocking: `H` does not start until the session ends — the frontier empty and the user confirming",
    );
    expectPhrase(skill, "convergence is the reviewer's verdict on four axes, not the user's");
    // And the no-question route stops rather than certifying an unpicked design.
    expectPhrase(skill, "the run stops there rather than certifying a design nobody picked");
  });

  it("sends a rejected choice back through a cycle", async () => {
    // Recording the answer does not change the HTML. Treating any answer as
    // sufficient would copy the unchanged iteration to `final` and certify the
    // design the user just turned down.
    const skill = await read(SKILL);
    expectPhrase(skill, "**Accepted** — the prototype is what they picked — goes to `H`");
    expectPhrase(
      skill,
      "takes the cycle-0 reset (`references/iteration-loop.md#sealed-loop`), carrying their answer as the pivot",
    );
    // Not the next cycle: convergence seals the loop, and `iterate --cycle N`
    // past the accepted index exits 2 without writing — so a next-cycle route
    // would refuse the one command that can build what the user asked for.
    expectPhrase(
      skill,
      "a next-cycle route would refuse the one command that can build what they asked for",
    );
    expectPhrase(skill, "Cycle 0 is the documented escape hatch out of a sealed loop");
    // The reset keeps `iter-00` and deletes the rest, so it is a destructive
    // operation — and answering a design question is not consent to one.
    expectPhrase(skill, "**Ask for the reset before running it**, naming what it destroys");
    expectPhrase(skill, "answering a design question is not consent to one");
    expectPhrase(
      skill,
      "certifying the unchanged iteration would ship the design they turned down",
    );
    // The loop's own bound still applies, so the branch cannot run forever.
    expectPhrase(skill, "the ten-cycle budget is counted across resets here, not per reset");
    // The CLI restarts the count at cycle 0, so an unbounded chain of ten-cycle
    // loops is the budget removed by the one route that looks like keeping it.
    expectPhrase(skill, "stop and escalate rather than resetting again");
    // And a `stop` is not a rejection: it ends the run rather than resetting.
    expectPhrase(skill, "**Stopped** — the user said `stop` — ends the run there");
    expectPhrase(skill, "a stop ends the session immediately and a reset is further work");
    // And `proceed` / `done` are closures rather than rejections: the user
    // ended the asking, not the work, so a reset is work they did not ask for.
    expectPhrase(skill, "**Closed** — `proceed` or `done` — finishes the running lookups");
    expectPhrase(skill, "the user ended the asking, not the work");
    // The converged-prototype choice is not assumable by a closure: it is what
    // the loop was run to answer and this skill's own `ask-user` operation, so
    // a closure that handed off with it assumed would certify an unpicked
    // design by the one route the no-question branch already refuses.
    expectPhrase(skill, "**This question is not among them.**");
    expectPhrase(skill, "a closure cannot assume the one choice the whole run exists to obtain");
  });

  it("carries the session's answers into the loop", async () => {
    // The generator runs from contracts and a fixed prompt, the reviewer from
    // four fixed axes. Neither says anything about this prototype's purpose, so
    // answers with no destination are answers the loop cannot read — and it
    // will contradict them on the next cycle.
    const skill = await read(SKILL);
    expectPhrase(skill, "`.qfai/evidence/prototyping/grilling.md`");
    expectPhrase(skill, "under `## Session` for the decisions");
    expectPhrase(skill, "`## Escalated` for anything the user has yet to settle");
    // An answered escalation leaves the open section, or the same decision
    // reads as settled and open at once — and the delegated prompts consume
    // every matching row.
    expectPhrase(
      skill,
      "**replacing any row with the same `Scope` and decision rather than adding beside it",
    );
    expectPhrase(skill, "removing its row from `## Escalated`**");
    expectPhrase(skill, "the current state of the tree, not its history");
    // Two answers to one decision steer the next cycle in two directions: the
    // delegated prompts consume every row matching their lineage, so a
    // superseded pivot is still read.
    expectPhrase(skill, "a superseded pivot still steers the next cycle");
    // Both consumers, named where each lists its inputs.
    const evaluator = /## Evaluator Inputs \(Mandatory\)([\s\S]*?)^## /m.exec(skill)?.[1] ?? "";
    expect(unwrap(evaluator)).toContain(".qfai/evidence/prototyping/grilling.md");
    expect(unwrap(skill)).toContain(
      "Generator reads contracts + `.qfai/evidence/prototyping/grilling.md`",
    );
  });

  it("says what each mistake costs", async () => {
    // The boundary is a judgement call at the edges, so the skill gives the
    // reader the cost of each error rather than a list to match against.
    const skill = await read(SKILL);
    expectPhrase(skill, "building is the expensive way to learn something a sentence would have");
    expectPhrase(skill, "it costs a session rather than a cycle");
  });

  it("keeps the decision with the user after the prototype exists", async () => {
    // The failure this stops is the one the rule spends every round avoiding,
    // and a prototype makes it easier rather than harder: the agent now has
    // evidence, which is exactly what makes deciding alone feel justified.
    const skill = await read(SKILL);
    expectPhrase(skill, "**The prototype makes a decision answerable; it does not take it.**");
    expectPhrase(skill, "ask the question again against it");
    expectPhrase(skill, "with more evidence than before, and still not the user's answer");
  });

  it("leaves the scope floor where it was", async () => {
    // Which specs the loop covers is decided elsewhere. A session that could
    // narrow it would turn a coverage rule into a conversation.
    const skill = await read(SKILL);
    expectPhrase(skill, "The scope floor is unchanged");
    expectPhrase(skill, "no session narrows it");
  });

  it("leaves the session's decisions to the session's own policy", async () => {
    // The buckets classify the operations this skill performs. A frontier
    // decision is the session's, and listing it here would let an orchestrator
    // treat an open-ended session as part of this section's 0-1 prompt policy
    // instead of running it to its own end condition.
    const skill = await read(SKILL);
    const askUser = askUserBucket(skill);
    expect(askUser).toContain("asked again against it");
    expect(askUser).not.toContain("what the prototype is for");
    expectPhrase(
      skill,
      "the session's own decisions are classified there rather than in this skill's buckets",
    );
  });

  it("grills only what the frozen inputs leave open", async () => {
    // The specs, the UI contracts and DESIGN.md answer some of these already,
    // and the method reads a fact rather than asking about it. A session that
    // re-opens a frozen requirement produces an answer that drifts from it.
    const skill = await read(SKILL);
    expectPhrase(skill, "**Only what the inputs leave open.**");
    expectPhrase(skill, "a question they answer is not on the frontier");
    expectPhrase(skill, "produces an answer that drifts from it");
  });

  it("scopes every row to the lineage it applies to", async () => {
    // One invocation runs a lineage per spec and screen, so a record with no
    // key applies every answer to each of them. `global` is written rather
    // than inferred from a missing key, because a missing key is also what an
    // unscoped row looks like.
    const skill = await read(SKILL);
    expectPhrase(skill, "**Every row names what it applies to**");
    expectPhrase(skill, "`<spec-id>/<screen>`");
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
    const skill = await read(SKILL);
    expectPhrase(skill, "**The file is written before C0, empty session or not.**");
    expectPhrase(skill, "a different statement from a file that is not there");
  });

  it("keeps the record across a handoff", async () => {
    // Stage evidence is regenerable and ignored. These answers are not: nothing
    // reproduces them, and every later generator and reviewer must read them.
    const skill = await read(SKILL);
    expectPhrase(skill, "**It is a user decision, not stage evidence.**");
    expectPhrase(skill, "The managed ignore block negates this path");

    // Asserted against the block the writer emits, not against the source that
    // builds it: git applies the last matching pattern, so what decides is the
    // order of the lines as they land in a project's `.gitignore`.
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    const order = [
      // Ignore the directory's contents…
      ".qfai/evidence/prototyping/*",
      // …re-include the directory, because git never descends into an ignored
      // one and nothing inside can be re-included until it does…
      "!.qfai/evidence/prototyping/",
      // …and re-include the one record. Everything else in there —
      // `mutation-log.jsonl`, the `iter-NN/` captures, `progress.md` — stays
      // ignored by the first line, which is why it has to be there at all.
      "!.qfai/evidence/prototyping/grilling.md",
    ].map((line) => lines.indexOf(line));
    expect(
      order.every((at) => at > -1),
      "a line of the three is missing from the managed block",
    ).toBe(true);
    expect(
      [...order].sort((a, b) => a - b),
      "the three are out of order, so the last matching pattern is the wrong one",
    ).toEqual(order);
  });

  it("hands the record to the delegated roles, not only to this skill", async () => {
    // The generator and the reviewer run from injected contracts. A record
    // named only in the parent skill is one the roles that build and grade the
    // prototype never read.
    const generator = await read(GENERATOR_PROMPT);
    expectPhrase(generator, "`.qfai/evidence/prototyping/grilling.md`");
    expectPhrase(generator, "Every cycle, not only the first");

    const reviewer = await read(REVIEWER_PROMPT);
    expectPhrase(reviewer, "Session record: `.qfai/evidence/prototyping/grilling.md`");
    expectPhrase(reviewer, "grades every prototype against the same generic bar");

    // Both carry the lineage filter, or another screen's answer constrains this
    // one — the scoping in the parent skill does not reach an injected prompt.
    for (const prompt of [generator, reviewer]) {
      expect(unwrap(prompt)).toContain("plus the `global` ones, and no others");
    }
  });

  it("agrees with the rule master it points at", async () => {
    // The rule states the same boundary from its side. If one moved without
    // the other, an agent would be told to grill and not to grill the same
    // question, which is worse than either instruction alone.
    const skill = await read(SKILL);
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
