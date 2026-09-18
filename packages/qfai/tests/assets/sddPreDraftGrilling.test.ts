/**
 * The grilling loop `/qfai-sdd` runs before a phase writes.
 *
 * Every assertion pins a clause that stops the loop collapsing into something
 * the skill already had, or into something that never fires. The failure modes
 * are the loop becoming the Reviewer Gate under another name, the orchestrator
 * answering the questions it is holding, a trigger that no ordinary run meets,
 * and a session whose absence leaves no trace — each of which leaves the stage
 * where it was, with a record saying otherwise.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const LOOP = "assistant/skills/qfai-sdd/references/sdd-pre-draft-grilling.md";
const CHECKLISTS = "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md";
const GATE = "assistant/skills/qfai-sdd/references/sdd-quality-gate.md";
const EVIDENCE_TEMPLATE = "assistant/skills/qfai-sdd/templates/evidence/sdd-spec.md";
const PRIMITIVE = "assistant/skills/qfai-grilling/SKILL.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — the pre-draft grilling loop", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");

  it("covers every phase that produces a design decision", async () => {
    // Named phases, not "each phase". A phase left out is one whose decisions
    // are taken by whoever writes it. Phase 2c is on the list because it makes
    // contract choices after Phase 0 has written — the phase an
    // artifact-exists trigger would have exempted.
    const loop = await read(LOOP);
    for (const phase of [
      "Phase 0: Contracts-first",
      "Phase 1: Outline",
      "Phase 2: Slice",
      "Phase 2c: Obligation reconciliation",
      "Phase 3: Plan finalize",
    ]) {
      expectPhrase(loop, phase);
    }
    const checklists = await read(CHECKLISTS);
    expect(unwrap(checklists).match(/Pre-draft grilling run/g) ?? []).toHaveLength(5);
  });

  it("triggers on the write, not on the artifact being absent", async () => {
    // The failure this avoids is total: most runs are `UPDATE:APPEND` or
    // `UPDATE:MODIFY` against artifacts that already exist, so a rule keyed on
    // existence would never fire on the ordinary path.
    const loop = await read(LOOP);
    expectPhrase(loop, "**The freeze point is this invocation's first write or design mutation");
    expectPhrase(loop, "a rule keyed on existence would never fire on them");

    const skill = await read(SKILL);
    expectPhrase(skill, "not whether the artifact already exists");
  });

  it("is distinguished from the Reviewer Gate on both sides", async () => {
    // Left alone, the loop collapses into the gate: both route reviewers, both
    // return findings, and one of them is easier to skip. What keeps them apart
    // is what each can see — a gate reads the artifact, so a premise nobody
    // chose reaches it as a premise.
    const loop = await read(LOOP);
    expectPhrase(loop, "## It is not the Reviewer Gate");
    expectPhrase(loop, "Before the phase writes");
    expectPhrase(loop, "Has this been decided");
    expectPhrase(loop, "a premise nobody chose returns `PASS`");
    expectPhrase(loop, "Both run.");

    const skill = await read(SKILL);
    expectPhrase(skill, "This is not the Reviewer Gate below and does not replace it.");
  });

  it("grills every routed author, over one frontier", async () => {
    // Phase 2 routes three drafting roles. Grilling one leaves the others free
    // to settle requirement, test-design or UX decisions after the session and
    // before their own writes — which is the loop running and changing nothing.
    const loop = await read(LOOP);
    expectPhrase(loop, "**One session per phase, over one frontier.**");
    expectPhrase(loop, "grilling one of them leaves the others free");
    expectPhrase(loop, "into a single tree before the first round");

    const skill = await read(SKILL);
    expectPhrase(skill, "**One session per phase, over every routed drafting role's decisions.**");
  });

  it("escalates agreement, not only deadlock", async () => {
    // A decision the author accepted from the griller inside the budget is not
    // open, so the convergence rules do not escalate it — and the delegation
    // baseline says an unadjudicated agent-to-agent decision makes the artifact
    // one no reviewer can clear. Escalating the residue alone therefore hands
    // the authors a settled set whose agreed half is the half that fails.
    const loop = await read(LOOP);
    expectPhrase(loop, "**Step 3 covers agreement, not only deadlock.**");
    expectPhrase(loop, "not only the ones still open after the budget");
    // Agreement leaves the frontier and does not settle the decision, so the
    // convergence rules do not reach it and step 3 has to.
    expectPhrase(loop, "has left the frontier");
    expectPhrase(loop, "nobody with the standing to take it has");
    // Agreement leaves the frontier and does not settle the decision, so the
    // convergence rules do not reach it and step 3 has to.
    expectPhrase(loop, "has left the frontier");
    expectPhrase(loop, "nobody with the standing to take it has");
    expectPhrase(loop, "whose agreed half is the half that fails review");
    // With the one exception that is not a decision at all.
    expectPhrase(loop, "Authoritative evidence is the exception because it is not a decision");
    expectPhrase(loop, "asks them to re-decide\nwhat they already decided");
  });

  it("keeps the orchestrator out of the answers", async () => {
    // The skill forbids the orchestrator authoring the primary artifact, and a
    // loop it answers itself is the same failure by another route.
    const loop = await read(LOOP);
    expectPhrase(loop, "Holding the loop is not authoring.");
    expectPhrase(loop, "does not answer its questions");

    const skill = await read(SKILL);
    expectPhrase(skill, "the orchestrator routes it and does not answer its questions");
  });

  it("writes a skip down, so an omitted session is the absence", async () => {
    // A phase whose subject is settled has nothing to grill, and that is a
    // legitimate outcome. It is also indistinguishable from a session nobody
    // ran, unless one of them is recorded.
    const loop = await read(LOOP);
    expectPhrase(loop, "## What the phase records");
    expectPhrase(loop, "**A run-or-skip line per phase**");
    expectPhrase(loop, "an omitted session and a legitimate skip are the same absence");

    const gate = await read(GATE);
    expectPhrase(gate, "carries a row for every **grilling-covered** phase this run entered");
    // Phase 2b and Phase 4 produce no design decision, so requiring a row for
    // them would either reject valid evidence or force a row claiming a
    // session that was never owed.
    expectPhrase(gate, "Phase 0, 1, 2, 2c and 3, and only those");
    // And the canonical evidence template carries the section, or every
    // template-derived run fails a gate on a heading it was never given.
    const template = await read(EVIDENCE_TEMPLATE);
    expectPhrase(template, "## Pre-draft Grilling");
    expectPhrase(template, "`Session` is `run`, `skipped` or `escalated`");
    expectPhrase(gate, "A\n  missing row is the finding");
  });

  it("records who adjudicated each decision", async () => {
    // The reviewer reads its `Recommended and unadjudicated` answer off these
    // rows, holding no memory of the session. One marker for both outcomes
    // makes the two indistinguishable in the row it is told to rely on.
    const loop = await read(LOOP);
    expectPhrase(loop, "`Task title` = `grilling(<phase>/<adjudication>): <the decision>`");
    // The phase is first because the shared schema has no column for it, and a
    // row that cannot be assigned to a phase is one an omission elsewhere is
    // counted against.
    expectPhrase(loop, "the phase first, because the schema has no column for it");
    expectPhrase(loop, "The griller may review the artifact");
    expectPhrase(loop, "The reviewer returns `REVISE` and names it");

    const gate = await read(GATE);
    expectPhrase(gate, "names who adjudicated the decision, `user`\n  or `agents`");
  });

  it("blocks on an escalation nobody answered", async () => {
    // `08_Open-questions.md` does not gate a spec stage, so a no-question run
    // could record `run`, write the phase, and reach DONE with a user-owned
    // design choice unset. Writing anyway encodes a decision nobody took, by
    // the one path where nobody can be asked.
    const loop = await read(LOOP);
    expectPhrase(loop, "the phase's row reads `escalated`, and **the\nphase does not write**");
    expectPhrase(loop, "stays `PENDING`, which\nblocks DONE and leaves the stage resumable");

    const gate = await read(GATE);
    expectPhrase(gate, "an `escalated` row needs a `PENDING` work order for it");
    // And `run` cannot carry one: a `run` row with an escalation in its count
    // reads as finished while a user-owned decision is open.
    expectPhrase(gate, "A row reads `run` only with zero escalations");
    // The count is checkable, because the phase is the title's first field. A
    // row that cannot be assigned to a phase is one an omission elsewhere is
    // counted against.
    expectPhrase(
      gate,
      "Each phase's settled count equals the number of `grilling(<phase>/...)` rows",
    );
    expectPhrase(gate, "an omitted row passes by being counted against another");
    // The order is recorded rather than claimed, per state: requiring both
    // times of every state would make two legitimate ones unrecordable, and a
    // state nobody can record honestly gets recorded dishonestly.
    expectPhrase(gate, "Every row carries the times its state has");
    expectPhrase(gate, "where both are present the first is earlier");
    expectPhrase(gate, "would instead make two legitimate states unrecordable");
    // Phase 2c recomputes its scope after every contract write, so one row
    // records the first checkpoint and hides every later one.
    expectPhrase(gate, "Phase 2c carries one row per expansion, `2c.1` upward");
  });

  it("keeps the escalation reachable on a host without the tool", async () => {
    // A host that offers no structured question tool is not a reason to skip
    // the escalation; it is the reason the rule has a fallback, and the parts
    // survive it.
    const loop = await read(LOOP);
    expectPhrase(
      loop,
      "where it is\n   callable for that question and through the same rule's fallback",
    );
    expectPhrase(loop, "it is the reason the fallback exists");
    // And the skill's own summary, which an operator reads instead of the
    // reference: a corrected reference beside an uncorrected summary leaves the
    // contradiction where it is most likely to be read.
    const skill = await read(SKILL);
    expectPhrase(skill, "where it is callable for that question, and through the fallback in");
  });

  it("sends a fact only the user holds to the user", async () => {
    // No author can answer an unpublished constraint, and the convergence rules
    // escalate decisions rather than facts — so without this the fact sits on
    // the frontier until the budget ends, taking every decision waiting on it.
    const primitive = await read(PRIMITIVE);
    expectPhrase(primitive, "**A fact only the user holds goes to the user, not to an author.**");
    expectPhrase(
      primitive,
      "It escalates immediately, as a request for the value rather than a choice",
    );
    // Under a no-question mode what follows depends on the fact, not its kind:
    // stopping on every user-held fact would block a run over a defaultable
    // date, which is the ordinary no-question path rather than a blocker.
    expectPhrase(primitive, "depends on the fact rather than on its kind");
    expectPhrase(
      primitive,
      "Stopping on every user-held fact would block a run over a defaultable date",
    );
  });

  it("keeps an author's answer as a position", async () => {
    // The orchestrator may not record an answer as the user's, and in an
    // agent-to-agent round every answer comes from an author — so a rule
    // reading as user-only leaves the round unable to be recomputed, a
    // disagreement unable to be kept, and an escalation with no positions.
    const primitive = await read(PRIMITIVE);
    expectPhrase(
      primitive,
      "MUST NOT record an answer **as the user's** that the user did not give",
    );
    expectPhrase(primitive, "recorded as that author's position, with whose it is");
    expectPhrase(primitive, "**Agreement closes a node; it does not settle a decision.**");
    // Open is about the round — is there anything to ask. Settled is about
    // the decision — has anyone with the standing to take it done so.
    expectPhrase(primitive, "The two are one state read for two purposes");
    expectPhrase(
      primitive,
      "an agreed answer nobody adjudicated is what a stage records as `agents`",
    );
  });

  it("forwards every distinct position, not two", async () => {
    // Phase 2 routes three authors, so a decision can carry three answers.
    // Merging two before the user sees them hands the user a choice the full
    // set was never asked to adjudicate.
    const loop = await read(LOOP);
    expectPhrase(loop, "**Every distinct position, named with whose it is**");
    expectPhrase(loop, "hands them a choice the full set was never asked to adjudicate");
  });

  it("gives Phase 2c a checkpoint per expansion", async () => {
    // Its scope is recomputed after every contract write and the reconciliation
    // repeats, so a frontier collected before the first write cannot hold the
    // decisions of a spec the third write brought in.
    const loop = await read(LOOP);
    expectPhrase(loop, "**Phase 2c gets a checkpoint per expansion, not one per phase.**");
    expectPhrase(loop, "runs its own round before the next mutation, **and writes its own row**");
    expectPhrase(loop, "`2c.1`, `2c.2`, and so on, in the order they ran");
    expectPhrase(loop, "the same evidence a run that skipped them produces");
  });

  it("leaves the artifact write with the agent that owns it", async () => {
    // `07_Decisions.md` and `09_delta.md` are primary artifacts and the
    // orchestrator may not draft one. On a CREATE run the file may not exist,
    // so writing it is authoring rather than integrating an author's output.
    const loop = await read(LOOP);
    expectPhrase(
      loop,
      "**Each settled decision is persisted by the drafting agent that owns its artifact**",
    );
    expectPhrase(loop, "writing it is authoring and not integration");
    expectPhrase(loop, "What the orchestrator records is the orchestration evidence");
  });

  it("makes `run` mean nothing was left escalated", async () => {
    // A `run` row carrying an escalation in its count reads as finished while a
    // user-owned decision is open, and the gate's PENDING requirement keys on
    // the cell rather than the count.
    const loop = await read(LOOP);
    expectPhrase(loop, "`run` means the phase settled its frontier and escalated nothing");
    expectPhrase(loop, "One escalation makes the row `escalated`, whatever else the phase settled");
    // And the counts are checkable: each decision row carries its phase.
    expectPhrase(loop, "**The settled count is the number of decision rows for that phase.**");
    expectPhrase(loop, "a count without the rows behind it is a number nobody can check");
  });

  it("records when the session ended and when the phase wrote", async () => {
    // A row holding only the outcome reads the same whether the session ran
    // before the phase, after it, or not at all — it is written at the end
    // either way.
    const loop = await read(LOOP);
    expectPhrase(loop, "carrying what its state has");
    expectPhrase(loop, "Where both are present the first is earlier, and that is the whole check");
    expectPhrase(loop, "a state nobody can record honestly is one an agent records dishonestly");
  });

  it("grills every routed drafting role Phase 2 has", async () => {
    // `solution-architect` drafts the structural, contract and architecture
    // sections and is mandatory in the routing phase Phase 2 sits in. Left out,
    // it settles structural decisions after the frontier and before its write.
    const loop = await read(LOOP);
    expectPhrase(loop, "`requirements-analyst`, `solution-architect`, `test-design-analyst`");
  });

  it("counts the constitution as authoritative evidence", async () => {
    // Both this skill and the primitive rank it above the specs. Left off the
    // list, a question an invariant already fixes is put to the user — and
    // answering differently produces a draft that cannot be valid.
    const loop = await read(LOOP);
    expectPhrase(loop, "`.qfai/assistant/constitution/**`, `.qfai/specs/**`");
    expectPhrase(loop, "a draft that cannot be valid");
    expectPhrase(loop, "blocks waiting for an answer the repository already holds");
  });

  it("recomputes the tree against each answer", async () => {
    // A decision whose prerequisite was open could not enter either agent
    // round, and putting it in the first escalation would ask it before the
    // answer it depends on exists.
    const loop = await read(LOOP);
    expectPhrase(loop, "Recompute the tree against each answer, and put what it newly exposes");
    expectPhrase(loop, "Repeat until no node is open");
  });

  it("lets a phase build the throwaway its method requires", async () => {
    // Where talking cannot settle a question, the method builds something to
    // react to. A freeze over every write would leave a UI-bearing phase unable
    // to build it, and so unable to settle the decision or proceed.
    const loop = await read(LOOP);
    expectPhrase(loop, "**A throwaway built to answer a question is not the phase writing.**");
    // The freeze names the files it covers, so the exception is bounded.
    expectPhrase(loop, "`_policies/**`, `spec-*/**`");
    expectPhrase(loop, "the files a later reader takes the design from");
  });

  it("shows one row shape, matching the gate", async () => {
    // The procedure's own example is what an operator copies. Short of the
    // canonical columns, copying it produces evidence the same procedure's gate
    // rejects.
    const loop = await read(LOOP);
    expectPhrase(loop, "| Phase | Session   | Ended at  | Wrote at  |");
  });

  it("lets a read-only phase record no write", async () => {
    // A `confirm-only` rerun enters Phase 2c read-only and writes nothing, so
    // demanding a write time would make a supported mode uncompletable.
    const gate = await read(GATE);
    expectPhrase(gate, "`Wrote at` where the phase mutated something");
    expectPhrase(gate, "a rule demanding both would make that supported mode uncompletable");
  });

  it("cites the method rather than restating it", async () => {
    // Three files own parts of this: the rule owns the method, the convergence
    // rules own how a session with no user in it ends, and the delegation
    // baseline owns what a griller's own recommendation disqualifies. A copy
    // here is a copy that drifts, and the drift is invisible until two files
    // give an agent different instructions.
    const loop = await read(LOOP);
    for (const master of [
      ".agents/rules/grilling.md",
      "review-convergence.md#agent-to-agent-grilling-must",
      "shared-skill-delegation-baseline.md#a-grillers-recommendations-and-what-they-disqualify",
      ".agents/rules/user-questions.md",
    ]) {
      expectPhrase(loop, master);
    }
    expectPhrase(loop, "Neither is repeated here.");
  });

  it("names a mode the primitive can actually run", async () => {
    // The primitive said a round is put to the user by the agent the user is
    // talking to, and its gate called any count a finding. A griller
    // interviewing an author on a two-round budget is neither, so the loop
    // routed through a skill that would have rejected it.
    const primitive = await read(PRIMITIVE);
    expectPhrase(primitive, "the griller puts the round to the authors");
    expectPhrase(primitive, "That is a different answerer, not a delegated question");
    expectPhrase(primitive, "A budget bounds its rounds");
    // Exactly one role puts the round, or an author is asked twice and the
    // two answers have no tie-break.
    expectPhrase(
      primitive,
      "**Who puts the round depends on the mode, and exactly one role does.**",
    );
    // And a frontier holding several authors' decisions needs round
    // semantics: everyone sees the whole round, every answer lands before the
    // frontier moves, and a disagreement is a decision rather than an average.
    expectPhrase(primitive, "The round goes to **every author whose decisions it contains**");
    expectPhrase(primitive, "**Every answer is collected before the frontier is recomputed.**");
    expectPhrase(
      primitive,
      "**Two authors answering one question differently is itself a decision**",
    );
  });

  it("leaves the fixed phase order alone", async () => {
    // The loop is a step inside a phase, not a phase. A new entry in the fixed
    // order would reach the routing crosswalk, every span in it, and each
    // skill's read of that order.
    const skill = await read(SKILL);
    const order = /## Stage and Phase Order \(Fixed\)([\s\S]*?)\n## /.exec(skill);
    expect(order, "the fixed order section is gone").not.toBeNull();
    expect(order?.[1] ?? "").not.toMatch(/grilling/i);
  });
});
