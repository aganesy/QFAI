/**
 * The grilling loop `/qfai-sdd` runs before a phase freezes its first draft.
 *
 * Every assertion here pins a clause that stops the loop collapsing into
 * something the skill already had. The two failure modes are the loop becoming
 * the Reviewer Gate under another name, and the orchestrator answering the
 * questions it is holding — each of which leaves the stage exactly where it was
 * before the loop existed, with a record saying otherwise.
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

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — the pre-draft grilling loop", (tree) => {
  it("runs before every phase that produces a design decision", async () => {
    // Named phases, not "each phase". The order is fixed, and a phase left out
    // is one whose decisions are taken by whoever drafts it.
    const loop = await read(tree, LOOP);
    for (const phase of [
      "Phase 0: Contracts-first",
      "Phase 1: Outline",
      "Phase 2: Slice",
      "Phase 3: Plan finalize",
    ]) {
      expectPhrase(loop, phase);
    }
    // And the checklists carry the obligation where the phase is actually run.
    const checklists = await read(tree, CHECKLISTS);
    expect(unwrap(checklists).match(/Pre-draft grilling run/g) ?? []).toHaveLength(4);
  });

  it("freezes at the first draft, and says why", async () => {
    // The whole value is in running before an artifact exists. Once one does, a
    // decision argued against it is a change rather than a choice, which is a
    // more expensive conversation and one people decline to have.
    const loop = await read(tree, LOOP);
    expectPhrase(loop, "**The first draft is the freeze point.**");
    expectPhrase(loop, "a choice among options, and the cheaper conversation is already over");
  });

  it("is distinguished from the Reviewer Gate on both sides", async () => {
    // Left alone, the loop collapses into the gate: both route reviewers, both
    // return findings, and one of them is easier to skip. What keeps them apart
    // is what each can see — a gate reads the artifact, so a premise nobody
    // chose reaches it as a premise.
    const loop = await read(tree, LOOP);
    expectPhrase(loop, "## It is not the Reviewer Gate");
    expectPhrase(loop, "Before an artifact exists");
    expectPhrase(loop, "Has this been decided");
    expectPhrase(loop, "a premise nobody chose returns `PASS`");
    expectPhrase(loop, "Both run.");

    const skill = await read(tree, SKILL);
    expectPhrase(skill, "This is not the Reviewer Gate below and does not replace it.");
  });

  it("keeps the orchestrator out of the answers", async () => {
    // The skill forbids the orchestrator authoring the primary artifact, and a
    // loop it answers itself is the same failure by another route: the
    // decisions still get taken by the agent that integrates them.
    const loop = await read(tree, LOOP);
    expectPhrase(loop, "Holding the loop is not authoring.");
    expectPhrase(loop, "does not answer its questions");

    const skill = await read(tree, SKILL);
    expectPhrase(skill, "the orchestrator routes it and does not answer its questions");
  });

  it("sends every escalation to the user through the structured tool", async () => {
    // An escalation that reaches nobody is the loop reporting work it did not
    // do. Under a no-question mode the decision is opened rather than assumed,
    // because the assumption alone reads as settled to whoever finds it.
    const skill = await read(tree, SKILL);
    expectPhrase(skill, "Every escalated decision reaches the user through `AskUserQuestion`");
    expectPhrase(skill, "never recorded as an assumption alone");

    const loop = await read(tree, LOOP);
    expectPhrase(loop, "with both positions and a recommendation");
    expectPhrase(loop, "the decision is opened as a question rather than assumed");
  });

  it("cites the method rather than restating it", async () => {
    // Three files own parts of this: the rule owns the method, the convergence
    // rules own how a session with no user in it ends, and the delegation
    // baseline owns what a griller's own recommendation disqualifies. A copy
    // here is a copy that drifts, and the drift is invisible until two files
    // give an agent different instructions.
    const loop = await read(tree, LOOP);
    for (const master of [
      ".agents/rules/grilling.md",
      "review-convergence.md#agent-to-agent-grilling-must",
      "shared-skill-delegation-baseline.md#a-grillers-recommendations-and-what-they-disqualify",
      ".agents/rules/user-questions.md",
    ]) {
      expectPhrase(loop, master);
    }
    // Named as not repeated, so a later editor knows the omission is deliberate.
    expectPhrase(loop, "Neither is repeated here.");
  });

  it("names who plays the griller, and why a dual role is allowed", async () => {
    // Without this the loop needs a role nothing routes, and a skill that has
    // to invent one runs no loop at all. The reason the dual role is safe is
    // the reset context, and it is stated because the opposite reading — that a
    // reviewer must never have drafted — is the rule one file over.
    const loop = await read(tree, LOOP);
    expectPhrase(loop, "a second instance of a drafting role");
    expectPhrase(loop, "separate invocations with separate contexts");
    expectPhrase(loop, "does not remember drafting and cannot defer to itself");
  });

  it("leaves the fixed phase order alone", async () => {
    // The loop is a step inside a phase, not a phase. A new entry in the fixed
    // order would reach the routing crosswalk, every span in it, and each
    // skill's read of that order.
    const skill = await read(tree, SKILL);
    const order = /## Stage and Phase Order \(Fixed\)([\s\S]*?)\n## /.exec(skill);
    expect(order, "the fixed order section is gone").not.toBeNull();
    expect(order?.[1] ?? "").not.toMatch(/grilling/i);
  });
});
