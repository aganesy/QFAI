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
const SKILL = "assistant/skills/qfai-prototyping/SKILL.md";
const RULE = ".agents/rules/grilling.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s — prototyping and grilling", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");

  it("names both columns, not just the one it owns", async () => {
    // A skill that named only what it prototypes leaves the other half to
    // whoever reads it, and the reading that costs least effort is "prototype
    // everything" — which is the loop answering by building.
    const skill = await read(SKILL);
    expectPhrase(skill, "## What is grilled, and what is prototyped");
    for (const grilled of [
      "What the prototype is for",
      "What would count as better",
      "What is out of bounds",
    ]) {
      expectPhrase(skill, grilled);
    }
    for (const prototyped of ["How it should feel", "Which layout carries the task"]) {
      expectPhrase(skill, prototyped);
    }
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

  it("puts the pre-loop decisions in ask-user", async () => {
    // They are the decisions this skill's own run raises before it builds
    // anything, so they are its operations and belong in the bucket.
    const skill = await read(SKILL);
    const askUser = /- ask-user:\n([\s\S]*?)\n- hard-required:/.exec(skill)?.[1] ?? "";
    expect(unwrap(askUser)).toContain("what the prototype is for");
    expect(unwrap(askUser)).toContain("asked again against it");
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
