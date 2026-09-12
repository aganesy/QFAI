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

    it(`${tree}: a no-question mode silences the questions, not the session`, async () => {
      // Declaring a session must not become a way to ask under an invocation
      // told not to. Refusing to run at all is the other failure: the design
      // decisions are then settled by whoever needs an answer next, silently,
      // which is what the method exists to stop. The session runs, asks nobody,
      // and leaves each decision it could not settle open where the completion
      // gate reads it — Article X rule 6.
      const text = flat(await read(tree));
      expect(text).toMatch(/Run without asking; open every node left over as a question/);
      expect(text).toMatch(/Declaring a session is still not a way to ask/);
      expect(text).toMatch(/the assumption with no open question against it/);
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
    it(`${tree}: declares the opt-out rather than relying on a missing description`, async () => {
      // Omitting the description keeps a skill out of the model's reach only on
      // a host that tolerates one without it. A host that requires the field
      // registers nothing instead, which loses the front door entirely — so the
      // opt-out is declared and the description kept.
      const raw = await readSkill(tree, ENTRY);
      expect(frontMatter(raw), "a host that requires a description registers nothing").toMatch(
        /^description:/m,
      );
      expect(frontMatter(raw), "the opt-out is what keeps the agent from firing it").toMatch(
        /^disable-model-invocation: true$/m,
      );
      // Stated in the body, so the mechanism reads as a decision rather than a
      // setting someone helpfully removes.
      expect(flat(raw)).toMatch(/`disable-model-invocation: true` is the mechanism/);
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

// The skill bodies restate the method, so a clause the rule master gained after
// they were written leaves two mandatory instructions on one subject. Each case
// names the compliant path that goes missing without it.
describe("the primitive carries the master's clauses", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: a fact only the user holds has a node and a place on the frontier`, async () => {
      // An environment lookup cannot find it and it is not a decision, so two
      // node kinds leave it nowhere — and the decision below it then waits on a
      // node no round asks.
      const text = flat(await readSkill(tree, SKILL));
      expect(text).toMatch(/Fact only the user holds/);
      expect(text).toMatch(/no lookup reaches it, and it is not a decision either/);
      expect(text).toMatch(/nothing else can put it there/);
    });

    it(`${tree}: a question for a fact carries no recommended answer`, async () => {
      const text = flat(await readSkill(tree, SKILL));
      expect(text).toContain("with **no recommended answer**");
      // Options are a separate question from the recommendation, and the
      // candidate set answers it: asked as free text, "which of four supported
      // regions" loses the four.
      expect(text).toMatch(/the candidate set answers it/);
      expect(text).toMatch(/asked as a choice among them/);
    });

    it(`${tree}: a frontier larger than the tool is batched, not split into rounds`, async () => {
      // A host taking fewer questions than the frontier holds leaves the step
      // unexecutable: the agent either makes an invalid call or recomputes the
      // frontier early, which is a second round wearing one round's name.
      const text = flat(await readSkill(tree, SKILL));
      expect(text).toMatch(/host-sized batches/);
      expect(text).toMatch(/frontier is not recomputed between them/);
      expect(text).toMatch(/it never makes two rounds/);
    });

    it(`${tree}: the whole round falls back, and a no-question mode outranks it`, async () => {
      // Split across two carriers, a round stops being one thing the user sees
      // together. And routed by availability first, an --auto run would reach a
      // plain-text fallback the same document forbids it to use.
      const text = flat(await read(tree));
      expect(text).toMatch(/A no-question mode is read before any of this/);
      expect(text).toMatch(/no round is put at all/);
      expect(text).toMatch(
        /withholds the tool while still permitting questions is a different thing/,
      );
      expect(text).toMatch(/The whole round falls back, not the question that triggered it/);
      expect(text).toMatch(/say which question it could not carry/);
    });

    it(`${tree}: a session between agents has an end`, async () => {
      // No user is present to satisfy the second condition, so an unconditional
      // end condition makes the session uncompletable.
      const text = flat(await readSkill(tree, SKILL));
      expect(text).toMatch(/session between agents cannot reach condition 2/);
      expect(text).toMatch(/two, then every decision still open goes to the user/);
      // The budget bounds the rounds; the user ends the session.
      expect(text).toMatch(/The budget ends the rounds, not the session/);
      expect(text).toMatch(/review-convergence\.md/);
    });
  }
});

// Four places where the method told an agent one thing and an inherited rule
// told it another, or where it left the agent holding a decision the user owns.
describe("the session does not settle what the user settles", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: reading a fact directly is a sanctioned exception, not an override`, async () => {
      // The delegation baseline hard-stops on `unavailable` and forbids
      // continuing with self-execution. A skill that only says "read it
      // yourself" leaves an agent to pick which instruction wins, and two
      // agents pick differently.
      const text = flat(await read(tree));
      expect(text).toMatch(/under the baseline's sanctioned exception for a read-only fact lookup/);
      expect(text).toMatch(/This is not an override of the hard stop/);
      expect(text).toMatch(/it permits reading only/);
    });

    it(`${tree}: closing the questions still finishes the lookups in flight`, async () => {
      // A lookup that lands after the record is written can expose a decision,
      // and that decision is then missing from the assumptions the run proceeds
      // on — the one node nobody sees.
      const text = flat(await read(tree));
      expect(text).toMatch(/ends the asking, not the session's own work/);
      expect(text).toMatch(/Finish every lookup still running first/);
      expect(text).toMatch(/not only the nodes open when it arrived/);
    });

    it(`${tree}: a prototype is shown to the user, not judged by the agent`, async () => {
      // "The reaction is the answer" does not say whose reaction, so an agent
      // may read it as its own, and settle a question of taste on the user's
      // behalf while following the words.
      const text = flat(await read(tree));
      expect(text).toMatch(/put it in front of the user and ask the original question again/);
      expect(text).toMatch(/\*\*Their\*\* reaction is the answer/);
      expect(text).toMatch(/it does not transfer ownership of it/);
    });

    it(`${tree}: the entry point has one gate, and it is not a verdict`, async () => {
      // The gate rules on an artifact and this skill writes none, so a run that
      // waited for `PASS` would wait forever. Without the exemption the
      // inherited baseline and the remit row both point at a review target that
      // does not exist.
      const text = flat(await readSkill(tree, ENTRY));
      expect(text).toMatch(/therefore exempt from the baseline's reviewer gate/);
      expect(text).toMatch(/no `PASS` is requested, none is awaited/);
      // Bounded to the verdict: a dispatched lookup is still a delegation.
      expect(text).toMatch(/The exemption covers the verdict and nothing else/);
      expect(text).toMatch(/disqualified from answering it again as a check on itself/);
    });
  }
});

// The sanctioned exception is only a resolution while the baseline states it.
// Left to the skill alone it is the override the skill claims it is not.
describe("the delegation baseline sanctions the read-only lookup", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: names the exception, and bounds it to reading`, async () => {
      const text = flat(
        await readSkill(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
      );
      expect(text).toMatch(/### Sanctioned exception: a read-only fact lookup/);
      expect(text).toMatch(/\*\*Reading, never authoring\.\*\*/);
      expect(text).toMatch(
        /A primary artifact and a blocking review stay under the hard stop whatever their class/,
      );
      // Citing it is what separates a skill that read the rule from one that
      // simply carried on.
      expect(text).toMatch(/A skill claiming it MUST cite this section/);
    });
  }
});
