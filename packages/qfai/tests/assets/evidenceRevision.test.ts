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
const VOLUME = "assistant/skills/qfai-implement/references/volume-policy.md";

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
        "`Spec review` — completion-reviewer result (PASS or REVISE) with its `Reviewed revision`",
      );
      expect(skill).toContain(
        "`Code quality review` — implementation-reviewer result (PASS or REVISE) with its `Reviewed revision`",
      );
    });

    it(`${tree}: gate item 10 requires the final-tree observations to agree`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        // Article-free: the clause now opens a sentence of its own, after the
        // `Audited evidence hash` rule that addresses what the revision leaves out.
        "Of the item's four sub-agent observations (items 3, 5, 7, 8), **only items 7 and 8 judge the final tree**",
      );
      expect(skill).toContain("items 6, 7 and 8 agree among themselves");
    });

    it(`${tree}: item 5 is exempt, so item 6 is not forced to be a null refactor`, async () => {
      // Items 5, 7 and 8 were required to name one revision while item 6
      // demanded a refactor between them. On an uncommitted tree the refactor
      // moves the content address by construction, so the two were jointly
      // satisfiable only by refactoring nothing.
      const skill = flat(await read(tree, SKILL));
      const reference = flat(await read(tree, REFERENCE));

      expect(skill).toContain(
        "the GREEN is observed before Phase: Refactor, and step 4 there requests the reviews from `refactor` and never from `green`",
      );
      expect(skill).toContain(
        "made this gate and item 6 jointly satisfiable only by a refactor that changed nothing",
      );
      expect(reference).toContain(
        "left that pair jointly satisfiable only by a refactor that changed nothing — **only by not doing item 6**",
      );
      // The GREEN keeps the pre-refactor address, the way item 3 keeps its own.
      expect(reference).toContain("Item 5 keeps its round block's `Revision`");
    });

    it(`${tree}: the reference tables which tree each of items 3, 5, 6, 7, 8 addresses`, async () => {
      const reference = await read(tree, REFERENCE);

      expect(reference).toContain("## Which tree each gate item addresses");
      for (const row of [
        "| 3 — RED observed",
        "| 5 — GREEN observed",
        "| 6 — GREEN re-confirmed after refactor",
        "| 7 — `completion-reviewer` PASS",
        "| 8 — `implementation-reviewer` PASS",
      ]) {
        expect(reference).toContain(row);
      }
      expect(flat(reference)).toContain(
        "**Items 6, 7 and 8 MUST name the same revision. Items 3 and 5 each name their own**",
      );
    });

    it(`${tree}: the refactor-verify pair carries the address items 6, 7 and 8 share`, async () => {
      const skill = flat(await read(tree, SKILL));
      const delegation = flat(await read(tree, DELEGATION));

      // The write point is named, so the field is not left without one.
      expect(skill).toContain(
        "`Refactor verify revision` beside it: the state Phase: Refactor step 2's re-run was observed against",
      );
      expect(skill).toContain(
        "**That is the address items 6, 7 and 8 share**, that run being the only observation of the refactored tree taken before the reviews",
      );
      // In the completion reviewers' audit subject: it is what their own
      // `Reviewed revision` is checked against.
      expect(delegation).toContain("`Refactor verify command` / `result` / `revision`");
    });

    it(`${tree}: the three places share a procedure, not one address`, async () => {
      // The list summarises where the field is written. Calling the three
      // "the same address" contradicts the table two sections down: the round
      // block's `Revision` is the pre-refactor tree, the other two are final.
      // A producer following the summary would overwrite one of them.
      const reference = flat(await read(tree, REFERENCE));

      expect(reference).not.toContain("It appears in three places, all carrying the same address");
      expect(reference).toContain(
        "All three compute the address by the same procedure, but **each names the tree its own observation was taken against**",
      );
      expect(reference).toContain(
        "a round block's `Revision` names the pre-refactor tree, while `Refactor verify revision` and the reviewers' `Reviewed revision` name the final one",
      );
    });

    it(`${tree}: a T1 batched review re-takes item 6 on the closed tree`, async () => {
      // Members park in `refactor` while the rest of the coherent group is
      // implemented, so every later member's change moves the parked members'
      // `Refactor verify revision` while the group's single review pair reads
      // the closed tree — items 6, 7 and 8 could then never agree.
      const reference = flat(await read(tree, REFERENCE));
      const volume = flat(await read(tree, VOLUME));
      const skill = flat(await read(tree, SKILL));

      expect(volume).toContain(
        "**Re-verify every member on the closed tree, before the reviews.**",
      );
      expect(volume).toContain(
        "refresh all three of its `Refactor verify` fields — `command`, `result` and `revision`",
      );
      expect(reference).toContain(
        "**On a T1 batched review, item 6 is re-taken when the group closes.**",
      );
      expect(skill).toContain(
        "Item 6 stays per member, and the group's close re-takes it on the closed tree",
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
