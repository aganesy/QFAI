/**
 * The grilling rule master, pinned clause by clause.
 *
 * Every skill that grills cites this file instead of restating the method, so
 * the method exists in one place and a clause deleted here is deleted from
 * every stage at once — silently, because each stage's own tests go on passing.
 *
 * The suites beside this one pin what reads the master: the primitive
 * (`grillingSkill`), the between-agents budget (`agentGrillingConvergence`),
 * the reminder hooks (`grillingHooks`), and each wired stage's own wiring. What
 * is pinned here is the master's own content, which none of them assert.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  ASSISTANT_ASSET_MAX_LINES,
  countLines,
} from "../../src/core/doctor/assetLineBudget.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's copy first, then the one `qfai init` ships. */
const TREES = [
  ".agents/rules/grilling.md",
  "packages/qfai/assets/init/root/.agents/rules/grilling.md",
];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe.each(TREES)("%s", (rel) => {
  it("names the four parts an interview is made of", async () => {
    const master = await read(rel);
    // Without the tree there is no order, without the frontier no way to tell
    // an answerable question from a guess, without the round no unit to count,
    // and without the shape no way to answer one by number. A skill citing a
    // master missing any of them gets a name and improvises the rest.
    expectPhrase(master, "## The design tree");
    expectPhrase(master, "## The frontier");
    expectPhrase(master, "## A round");
    expectPhrase(master, "## The shape of a question");
  });

  it("keeps a dependent question out of the round it depends on", async () => {
    const master = await read(rel);
    // This is what makes the frontier worth computing. Asked together, the
    // dependent question can only be guessed at, and a guess recorded as an
    // answer is worse than an open question because nothing later reopens it.
    expectPhrase(master, "One round is one frontier: asked in full, answered in full.");
    expectPhrase(master, "Two questions never share a round when one depends on the other.");
    expectPhrase(master, "a guess recorded as an answer is worse than an open question");
  });

  it("splits facts from decisions, and puts each with its owner", async () => {
    const master = await read(rel);
    // The split is the rule's economy: every question it does not ask is one
    // the agent answered by reading. Lose it and the interview asks the user
    // for what the repository already holds.
    expectPhrase(master, "## Facts are yours, decisions are theirs");
    expectPhrase(master, "Never ask the user for something you could look up.");
    expectPhrase(master, "An agent that answers its own decisions has not read this rule");
  });

  it("carries no recommendation on a question that asks for a fact", async () => {
    const master = await read(rel);
    // A recommended value for a fact is a guess wearing the shape of advice,
    // and the shape invites the user to accept it.
    expectPhrase(master, "**A question asking for a fact carries no recommended answer.**");
    expectPhrase(master, "a guessed one is the corruption\nthe tree warns about");
  });

  it("recommends an answer on every question that decides something", async () => {
    const master = await read(rel);
    // Without it the user reconstructs the agent's reasoning before they can
    // disagree with it, and on a long round they stop reading instead.
    expectPhrase(master, "states the recommended answer on a line of its own");
    expectPhrase(master, "a user who disagrees with the third names the third");
  });

  it("states no question cap, and says why one would not help", async () => {
    const master = await read(rel);
    // The one number this rule must not acquire. A cap either truncates the
    // hard subject or looks arbitrary on the easy one, and an agent looking for
    // a reason to stop asking will find a cap first.
    expectPhrase(master, "There is no question cap, and adding one would not help");
    expectPhrase(master, "Break it up and grill the pieces.");
  });

  it("sends a question talking cannot settle to a throwaway build", async () => {
    const master = await read(rel);
    // The clause that stops a session ballooning: some questions need something
    // to react to, and rephrasing them forever is how scope grows to fill the
    // uncertainty. The prototype makes the question answerable; it does not
    // transfer the decision.
    expectPhrase(master, "## What talking cannot settle");
    expectPhrase(master, "Stop grilling and build the throwaway version.");
    expectPhrase(master, "The prototype is what makes the decision answerable");
  });

  it("keeps a no-question run from recording an unread assumption", async () => {
    const master = await read(rel);
    // A defaulted value with no open question beside it is a decision nobody
    // took, wearing the face of one somebody did — and nothing downstream can
    // recover the difference.
    expectPhrase(master, "## Under a no-question mode");
    expectPhrase(master, "What is forbidden is the assumption on its own");
  });
});

it("the shipped copy and this repository's copy are the same file", async () => {
  const [local, shipped] = await Promise.all(TREES.map(read));
  // `qfai init` writes the second from the first. A difference is one method in
  // this repository and another in every project that installed it, and no
  // assertion above would see it: each tree passes on its own.
  expect(shipped).toBe(local);
});

describe("the shipped rule masters stay inside the assistant asset ceilings", () => {
  const SHIPPED_RULES = "packages/qfai/assets/init/root/.agents/rules";

  it("no rule master is over the line ceiling", async () => {
    // The ceiling `.qfai/assistant/**` is held to, applied to the tree beside
    // it. These files are read in full by every agent that cites one, so the
    // reason for the ceiling is the same and only the directory differs — which
    // is why nothing was measuring them.
    const dir = path.join(repoRoot, SHIPPED_RULES);
    const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
    expect(names.length, "no rule master is shipped").toBeGreaterThan(0);

    const oversized: string[] = [];
    for (const name of names) {
      const content = await readFile(path.join(dir, name), "utf-8");
      if (countLines(content) > ASSISTANT_ASSET_MAX_LINES) oversized.push(name);
    }
    expect(oversized, `over ${ASSISTANT_ASSET_MAX_LINES} lines — split a topic out`).toEqual([]);
  });

  it("no rule master carries a line over the width ceiling", async () => {
    // A line past the width ceiling is one no diff shows usefully, so a change
    // inside it lands unreviewed.
    const dir = path.join(repoRoot, SHIPPED_RULES);
    const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));

    const wide: string[] = [];
    for (const name of names) {
      const content = await readFile(path.join(dir, name), "utf-8");
      const widest = Math.max(...content.split(/\r?\n/).map((line) => line.length));
      if (widest > ASSISTANT_ASSET_MAX_LINE_CHARS) wide.push(`${name} (${String(widest)})`);
    }
    expect(wide, `over ${ASSISTANT_ASSET_MAX_LINE_CHARS} characters on one line`).toEqual([]);
  });
});
