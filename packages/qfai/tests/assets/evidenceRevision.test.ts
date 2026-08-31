/**
 * Observations name the state they describe (#388).
 *
 * `qfai-implement` makes four sub-agent observations load-bearing preconditions
 * for `done`, and its Evidence hard rules declare that stale evidence MUST NOT
 * be reused. No shipped template or schema had any field naming the state that
 * was observed — not the reviewer response template, not the per-item evidence
 * contract, not the review-pack schema. A verdict that cannot be tied to a
 * revision cannot be re-checked, cannot be invalidated by a later commit, and
 * cannot be told apart from a stale one, so the rule had nothing to compare
 * against.
 *
 * The reference later gained a second rule, and it is the first one's corollary:
 * a blob hash is DERIVED from the revision (`git rev-parse <rev>:<path>`), so
 * writing blobs into prose beside the revision duplicates what the revision
 * already fixes — and the duplicate goes stale for reasons belonging to whichever
 * sibling item last touched the shared file. One exception, because no revision
 * determines it: a MUTANT blob, which is written to the working tree and never
 * committed.
 *
 * The pins below anchor on HEADINGS, on the literal derivation form, and on short
 * distinctive clauses, deliberately not on whole paragraphs: the rule is the
 * subject, and a reword of the surrounding prose must not redden this file.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/evidence-revision.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Wrap-tolerant containment: the sentence is the rule, its wrap column is not.
 * Blockquote markers are stripped too, so a wrapped `> ` quote reads as prose.
 */
const flat = (s: string): string => s.replace(/\n\s*>\s?/g, "\n").replace(/\s*\n\s*/g, " ");

describe("evidence and verdicts carry a revision", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the reviewer response template has the field`, async () => {
      const delegation = await read(tree, DELEGATION);

      expect(delegation).toContain("Reviewed revision: <git rev> | working-tree+<content hash>");
      expect(flat(delegation)).toContain("`Reviewed revision` is REQUIRED");
    });

    it(`${tree}: the baseline says why a moving tree is the normal case`, async () => {
      // Worktree separation constrains implementers; reviewers are dispatched
      // against the integrated tree by design, so this is not a misconfiguration
      // a better reviewer would avoid.
      const delegation = flat(await read(tree, DELEGATION));

      expect(delegation).toContain(
        "Reviewers are dispatched against the integrated tree by design, so the tree is legitimately allowed to move under them",
      );
      expect(delegation).toContain(
        "an honest, independent verdict on a tree that no longer exists is the normal failure this field addresses",
      );
    });

    it(`${tree}: the per-item evidence contract carries Revision`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "`Revision` — the state the observation was made against: `git rev-parse HEAD`, or `working-tree+<content hash>` for an uncommitted tree",
      );
      // The cardinality belongs to `Revision`. `RED test hash` carried it for a
      // while and so asked for a second hash nothing produces.
      expect(skill).toContain(
        "`Revision` is the field that is per round block and once more for the refactor-verify pair",
      );
      expect(skill).toContain(
        "`Spec review` — completion-reviewer result (PASS or REVISE), recorded with the unambiguous sibling fields `Spec reviewed revision`, `Spec audited evidence hash`, `Spec review pack`, and `Spec review pack seal`",
      );
      expect(skill).toContain(
        "`Code quality review` — implementation-reviewer result (PASS or REVISE), with the parallel sibling fields `Code quality reviewed revision`, `Code quality audited evidence hash`, `Code quality review pack`, and `Code quality review pack seal`",
      );
    });

    it(`${tree}: gate item 10 requires the four observations to agree`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        // Article-free: the clause now opens a sentence of its own, after the
        // `Audited evidence hash` rule that addresses what the revision leaves out.
        "item's four sub-agent observations (items 3, 5, 7, 8) all name the **same** revision",
      );
    });

    it(`${tree}: staleness is defined mechanically`, async () => {
      const skill = flat(await read(tree, SKILL));
      const reference = flat(await read(tree, REFERENCE));

      expect(skill).toContain("**Stale is mechanical**");
      expect(reference).toContain(
        "Evidence is **stale** when the revision it names differs from the revision the item's work finally landed at.",
      );
      // "The change was unrelated" is precisely the judgement the evidence
      // exists to remove.
      expect(reference).toContain(
        'do not carry the verdict forward because "the change was unrelated"',
      );
    });

    it(`${tree}: the reference says why a revision, not a timestamp`, async () => {
      const reference = flat(await read(tree, REFERENCE));

      expect(reference).toContain("## Why an address, not a timestamp");
      expect(reference).toContain(
        "A timestamp orders observations; it does not identify what was observed.",
      );
    });

    it(`${tree}: a blob is derived state, so the record cites the revision instead`, async () => {
      const raw = await read(tree, REFERENCE);
      const reference = flat(raw);

      // Pinned as a HEADING, not as prose that happens to contain the words.
      // `\r?` so a future EOL normalisation is not a false RED.
      expect(raw).toMatch(/^## Blobs are derived — cite the revision, not the hash\r?$/m);

      // The derivation form is the whole mechanism: it is what makes the blob
      // redundant with the revision rather than additional to it.
      expect(reference).toContain("A blob hash is **derived state**: `git rev-parse <rev>:<path>`");
      expect(reference).toContain("the reader runs `git rev-parse <rev>:<path>`");
      // Twice: once defining the derivation, once telling the reader to run it.
      // A rule stated only in the abstract leaves the reader without the command.
      expect(raw.split("`git rev-parse <rev>:<path>`").length - 1).toBeGreaterThanOrEqual(2);

      expect(reference).toContain("**Do not enumerate blob hashes in per-item prose.**");
      expect(reference).toContain("a duplicate can diverge from its source");
    });

    it(`${tree}: the mutant blob is the one exception, and the reference says why`, async () => {
      const reference = flat(await read(tree, REFERENCE));

      // The exception is licensed by the REASON, not by convenience: a mutation
      // is never committed, so `git rev-parse <rev>:<path>` has nothing to name.
      // Without the reason the exception reads as a loophole.
      expect(reference).toContain(
        "**The one exception, because no revision determines it: a _mutant_ blob.**",
      );
      expect(reference).toContain("never committed, so there is no object to derive");

      // What replaces the hash as the join key. The hash is optional and the
      // needle/replacement pair is not, which is the reproducibility claim.
      expect(reference).toContain(
        "**base revision + literal needle text + literal replacement text**",
      );
      expect(reference).toContain("keep its `git hash-object` value if you took one");

      // The exception is scoped to the mutant half only.
      expect(reference).toContain("name the revision, not the base blob");
    });

    it(`${tree}: a record-only commit stales nothing, so anchors may land with the transition`, async () => {
      const reference = flat(await read(tree, REFERENCE));

      // The staleness rule reads "any file the observation COVERED". A commit
      // touching only the record covers none, so it cannot stale the record it
      // is writing — otherwise no item could ever close, and no two items
      // sharing a file could be current at the same time.
      expect(reference).toContain("_any file the observation covered_");
      expect(reference).toContain(
        "covers no file any observation ran against, so it does not stale one",
      );
      expect(reference).toContain(
        "allows an item's anchors to be written in the same commit that closes it",
      );
      expect(reference).toContain(
        "Measure at the tip, then commit the record and the `done` transition together.",
      );
    });

    it(`${tree}: a review that could not get a coherent read is REVISE`, async () => {
      const reference = flat(await read(tree, REFERENCE));

      // The observed qa-gatekeeper case: the mandated back-to-back identical
      // run could not be produced because the tree changed inside it.
      expect(reference).toContain(
        "That is `REVISE` with the reason, not `PASS` with a caveat: a mandated back-to-back identical run that could not be produced is a gate that did not pass.",
      );
    });

    it(`${tree}: the SKILL points at the reference from every place it binds`, async () => {
      const skill = await read(tree, SKILL);
      const occurrences = skill.split("references/evidence-revision.md").length - 1;

      // Gate item 10, the evidence-hard-rules line, and the `Revision` field.
      expect(occurrences).toBeGreaterThanOrEqual(3);
    });
  }
});
