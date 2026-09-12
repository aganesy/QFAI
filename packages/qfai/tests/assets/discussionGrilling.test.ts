/**
 * `/qfai-discussion` runs its interview as a grilling session.
 *
 * This is the skill the whole grilling effort was reported against: it settled
 * design without asking, and the reason was in one line of its own process —
 * "Run the core interview", naming no method. An interview with no method is
 * the agent deciding and reporting, and every assertion here pins a part of
 * what replaced it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-discussion/SKILL.md";
const MATRIX = "assistant/skills/qfai-discussion/references/discussion-completion-matrix.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

/** Entries nested under one bucket header of the autopilot policy. */
function bucket(skill: string, name: string): string {
  const lines = skill.split(/\r?\n/);
  const header = new RegExp(`^\\s*[-*]\\s*${name}\\s*:`, "i");
  const anyHeader = /^\s*[-*]\s*(auto-decide|ask-user|hard-required)\s*:/i;
  const entries: string[] = [];
  let inside = false;
  for (const line of lines) {
    if (header.test(line)) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (anyHeader.test(line)) break;
    entries.push(line);
  }
  return unwrap(entries.join("\n"));
}

describe.each(TREES)("%s — the discussion interview", (tree) => {
  it("names a method instead of naming an interview", async () => {
    // The defect this replaces, in full: step 1 read "Run the core interview
    // for concept, scope, stakeholders, and constraints" and stopped. Nothing
    // said how, so an agent that asked nothing had followed it.
    const skill = await read(tree, SKILL);
    expectPhrase(skill, "as a grilling\n   session through the `qfai-grilling` skill");
    expectPhrase(skill, ".agents/rules/grilling.md");
    // The topics are the checklist's, not a second list that can drift from it.
    expectPhrase(skill, "references/discussion-coverage-checklist.md");
  });

  it("cites the method rather than restating it", async () => {
    // Two copies of a method drift, and the drift shows up as two instructions
    // an agent has to choose between.
    const skill = await read(tree, SKILL);
    expectPhrase(skill, "this step does not restate it");
    // The mechanics the rule owns. A copy here is a copy that drifts, and the
    // drift surfaces as two instructions an agent has to choose between.
    for (const mechanic of [
      /the whole frontier at once/i,
      /each question numbered/i,
      /never at a count/i,
      /facts (?:are )?looked up rather than asked/i,
    ]) {
      expect(unwrap(skill), `the skill restates the method: ${String(mechanic)}`).not.toMatch(
        mechanic,
      );
    }
  });

  it("puts the interview's decisions in ask-user, not auto-decide", async () => {
    // The policy had `equivalent-option pick` under auto-decide and no design
    // decision under ask-user. A design choice is not an equivalent-option
    // pick, and a skill that treats it as one records a design nobody agreed to
    // as decided.
    const skill = await read(tree, SKILL);
    const askUser = bucket(skill, "ask-user");
    const autoDecide = bucket(skill, "auto-decide");

    expect(askUser).toMatch(/frontier/i);
    expect(askUser).toMatch(/confirmation that closes the session/i);
    // Running the interview is what this skill performs, which is why its
    // questions are its own operations rather than an entry added to the
    // prototype's closed list.
    expect(askUser).toMatch(/what this skill\s*performs/i);
    // And the escape hatch is closed from the other side.
    expect(autoDecide).toMatch(/demonstrably equivalent, which a design choice is not/i);
  });

  it("holds authoring until the session has ended", async () => {
    // The whole value is in deciding before drafting. A pack drafted
    // mid-session records a design still being decided, and from then on the
    // run defends the draft rather than the decision.
    const skill = await read(tree, SKILL);
    expectPhrase(skill, "Artifact authoring does not start until the session's frontier is empty");
    expectPhrase(skill, "the user has\nconfirmed");
    expectPhrase(skill, "the draft is what the rest of the run then defends");
  });

  it("makes the end condition blocking, and says why it has to be", async () => {
    // A pack authored mid-session is indistinguishable from one authored after:
    // same fifteen files, same coverage, same register. The missing thing is
    // that anyone agreed, and no later gate can recover it.
    const matrix = await read(tree, MATRIX);
    expectPhrase(matrix, "the frontier empty, and the user confirming the understanding is shared");
    expectPhrase(matrix, "Not at a\n   count");
    expectPhrase(matrix, "the failure it catches leaves no other trace");
    expectPhrase(matrix, "nothing downstream can tell");
  });

  it("routes a no-question run to the register instead", async () => {
    // Under `--auto` nobody can give the confirmation, so a blocking condition
    // that only reads it would stop every such run outright. The open count is
    // what blocks there, which is the same guarantee by another route.
    const matrix = await read(tree, MATRIX);
    expectPhrase(matrix, "the confirmation has nobody to give it");
    expectPhrase(matrix, "registered as open questions instead");
    expectPhrase(matrix, "an open\n   count above zero closes nothing");
  });

  it("has the reviewer check the session, not only the pack", async () => {
    // Every other gate reads the fifteen files. A session that never ran leaves
    // them complete, so a reviewer reading only the pack confirms nothing about
    // whether its contents were decided.
    const skill = await read(tree, SKILL);
    expectPhrase(
      skill,
      "the grilling session that preceded authoring ended on an empty frontier with the user's\n  confirmation",
    );
    expectPhrase(skill, "references/oq-and-deferred-rules.md");
  });
});
