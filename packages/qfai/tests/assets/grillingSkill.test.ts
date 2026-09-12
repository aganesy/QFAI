/**
 * The primitive that holds the interview method.
 *
 * Every clause of it is load-bearing on its own: without the frontier a round
 * asks questions nothing can answer yet, without the fact/decision split the
 * round spends the user's attention on what the repository already states, and
 * without the end condition the whole skill is advice.
 *
 * The skill states the method rather than citing the cross-AI rule master that
 * also states it. `qfai init` does not write that master into an adopter's tree,
 * so a citation would resolve to nothing there — which is what the pointer case
 * below measures rather than assumes.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-grilling/SKILL.md";
const ENTRY = "assistant/skills/qfai-grill/SKILL.md";

const readSkill = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");
const read = (tree: string): Promise<string> => readSkill(tree, SKILL);

/** The front matter block, which is where a host reads a skill's offer from. */
const frontMatter = (raw: string): string => raw.slice(0, raw.indexOf("\n---", 4));

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the grilling primitive", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: states every clause of the method`, async () => {
      const text = flat(await read(tree));
      // One token per clause, each appearing in that clause only, so a clause
      // cannot be dropped while the file still satisfies this case.
      for (const clause of [
        /one implementation of the interview method/,
        /Not a substitute for a specification/,
        /a node hangs off whatever it depends on/,
        /prerequisites are all settled/,
        /Recompute the frontier from what is now settled/,
        /Read it, or dispatch a sub-agent to read it/,
        /answerable by number/,
        /spends no clarification budget/,
        /no fact lookup is still running/,
        /build something to react to/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    it(`${tree}: a no-question mode neither enters a session nor continues one`, async () => {
      // Without this the skill is a way to ask under an invocation told not to.
      // Forbidding only the asking is not enough: a session declared and then
      // unable to ask makes no progress and reports nothing.
      const text = flat(await read(tree));
      expect(text).toMatch(/Do not invoke, and do not continue a session already open/);
      expect(text).toMatch(/Declaring a session is not a way to ask/);
    });

    it(`${tree}: the end condition needs both halves and the user can end it early`, async () => {
      const text = flat(await read(tree));
      expect(text).toMatch(/two conditions, both required/);
      // Condition 1 is about the tree, not the frontier: when every remaining
      // decision waits on a lookup the frontier is empty while the tree is not.
      expect(text).toMatch(/the frontier is empty \*\*and\*\* no fact lookup is still running/);
      expect(text).toMatch(/The user confirms the understanding is shared/);
      // Completion is how a session ends on its own, not the only way one ends.
      expect(text).toMatch(/ends the session immediately, frontier empty or not/);
      expect(text).toMatch(/ends the asking/);
    });

    it(`${tree}: closing the questions is never an authorization`, async () => {
      // "Every decision still open becomes a labelled assumption" would put a
      // decision some document requires the user to record, and an undefaultable
      // input, on the assumption path — so a release or a deletion could ride a
      // choice nobody made.
      const text = flat(await read(tree));
      expect(text).toMatch(/never assumed, whatever the user answered/);
      expect(text).toMatch(/never an authorization the user has not given/);
    });

    it(`${tree}: a frontier decision cannot be moved to auto-decide`, async () => {
      // The buckets are the method. Read as a tuning surface, the one bucket
      // worth widening is the one that stops the agent answering its own
      // questions, which is the whole of what this skill does.
      const text = flat(await read(tree));
      expect(text).toMatch(/every decision on the frontier — that is what a round is/);
      expect(text).toMatch(/not a tuning surface/);
      expect(text).toMatch(/the agent answering its own question/);
      // The subject is the one input with no default: a session must be about
      // something, and picking that is answering the first question.
      expect(text).toMatch(/grilling subject/);
    });

    it(`${tree}: is deliberately un-routed`, async () => {
      // A `routing-profile:` this manifest routes nothing to is an error, and a
      // primitive has no review gate of its own — the invoking stage's covers
      // it. Declaring one here would be a gate nothing runs.
      const raw = await read(tree);
      const frontMatter = raw.slice(0, raw.indexOf("\n---", 4));
      expect(frontMatter).not.toMatch(/^routing-profile:/m);
      expect(flat(raw)).toMatch(/the gate that covers a session is the invoking stage's/);
    });

    it(`${tree}: every tree path it cites exists in that tree`, async () => {
      // The body states the method instead of citing the rule master precisely
      // so that an adopter reads no dead pointer. That only holds while the
      // pointers it does carry resolve.
      const raw = await read(tree);
      // The group is optional to the type checker even though the pattern
      // cannot match without it, so narrow rather than assert.
      const cited = [...raw.matchAll(/`(\.qfai\/[^`#]+?\.md)(?:#[^`]*)?`/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      );
      expect(cited.length, "the body cites no tree path at all").toBeGreaterThan(0);

      const missing: string[] = [];
      for (const rel of [...new Set(cited)]) {
        // Read against the tree under test: the shipped copy resolves inside
        // `assets/init/.qfai`, the mirror inside the repository's own `.qfai`.
        const target = path.join(repoRoot, tree, rel.replace(/^\.qfai\//, ""));
        const stats = await stat(target).catch(() => null);
        if (stats?.isFile() !== true) missing.push(rel);
      }
      expect(missing, "cited path that does not exist in this tree").toEqual([]);
    });
  }
});

// The user-invoked entry point. It is thin on purpose: the method lives in the
// primitive, and the split is what separates a session the user asked for from
// one a skill started.
//
// Two things make that split real rather than declared. The entry point carries
// no `description:`, which is what a host reads to decide whether to offer a
// skill to the model. And without the primitive it stops instead of
// interviewing from memory — an improvised interview reads exactly like the
// method, so nothing downstream could tell the two apart.
describe("the grill entry point", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: carries no description, and says why`, async () => {
      const raw = await readSkill(tree, ENTRY);
      expect(frontMatter(raw), "a description is what makes a skill model-invoked").not.toMatch(
        /^description:/m,
      );
      // Stated in the body, so the absence reads as a decision rather than an
      // oversight someone helpfully fills in.
      expect(flat(raw)).toMatch(/carries no `description:`, and that is the mechanism/);
      expect(flat(raw)).toMatch(/reached only when the user names it/);
    });

    it(`${tree}: stops rather than improvising when the primitive is absent`, async () => {
      const text = flat(await readSkill(tree, ENTRY));
      expect(text).toMatch(/\*\*Without the primitive, stop\.\*\*/);
      // Naming the missing file is the whole of the remedy: a stop that does not
      // say what is missing sends the user looking.
      expect(text).toMatch(/assistant\/skills\/qfai-grilling\/SKILL\.md` is not present/);
      expect(text).toMatch(/Do not interview from memory/);
      expect(text).toMatch(/an improvised interview is the failure this split exists to prevent/);
    });

    it(`${tree}: states no method of its own`, async () => {
      // Two statements of one method drift, and the one a user reads is the one
      // that gets forgotten. The entry point points; it does not restate.
      const text = flat(await readSkill(tree, ENTRY));
      expect(text).toMatch(/Not a place to state the method/);
      expect(text).toMatch(/A step this skill performs that the primitive does not describe/);
      expect(text).toMatch(/Read `\.qfai\/assistant\/skills\/qfai-grilling\/SKILL\.md`/);
    });

    it(`${tree}: writes no file, and ties that to where the gate is`, async () => {
      const text = flat(await readSkill(tree, ENTRY));
      expect(text).toMatch(
        /There is no invoking stage, so the gate is the user reading the record/,
      );
      expect(text).toMatch(/It is reported, not written/);
    });

    it(`${tree}: every tree path the entry point cites exists in that tree`, async () => {
      const raw = await readSkill(tree, ENTRY);
      const cited = [...raw.matchAll(/`(\.qfai\/[^`#]+?\.md)(?:#[^`]*)?`/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      );
      expect(cited.length, "the body cites no tree path at all").toBeGreaterThan(0);

      const missing: string[] = [];
      for (const rel of [...new Set(cited)]) {
        const target = path.join(repoRoot, tree, rel.replace(/^\.qfai\//, ""));
        const stats = await stat(target).catch(() => null);
        if (stats?.isFile() !== true) missing.push(rel);
      }
      expect(missing, "cited path that does not exist in this tree").toEqual([]);
    });
  }
});
