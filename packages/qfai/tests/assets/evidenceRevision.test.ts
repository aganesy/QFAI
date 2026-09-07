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
const VOLUME = "assistant/skills/qfai-implement/references/volume-policy.md";
const PARALLEL = "assistant/skills/qfai-implement/references/parallelization-policy.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const ROUND = "assistant/skills/qfai-implement/references/round-evidence.md";
const CHECKPOINT = "assistant/skills/qfai-implement/references/checkpoint-verification.md";
const AUDIT_HASH = "assistant/constitution/references/audited-evidence-hash.md";

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
      // while and so asked for a second hash nothing produces. It also has to
      // name the pair's field: "one more `Revision` for the refactor-verify
      // pair" read literally produces a second `Revision` and no
      // `Refactor verify revision`, which is the field item 10 reads.
      expect(skill).toContain(
        "`Revision` is the field that is per round block, and the refactor-verify pair's second address is **not** a second `Revision` beside it: it is the separate `Refactor verify revision` field",
      );
      expect(skill).not.toContain("once more for the refactor-verify pair");
      expect(skill).toContain(
        "`Spec review` — completion-reviewer result (PASS or REVISE), recorded with the unambiguous sibling fields `Spec reviewed revision`, `Spec audited evidence hash`, `Spec review pack`, and `Spec review pack seal`",
      );
      expect(skill).toContain(
        "`Code quality review` — implementation-reviewer result (PASS or REVISE), with the parallel sibling fields `Code quality reviewed revision`, `Code quality audited evidence hash`, `Code quality review pack`, and `Code quality review pack seal`",
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

      // The write point is named, so the field is not left without one.
      expect(skill).toContain(
        "`Refactor verify revision` beside it: the state Phase: Refactor step 2's re-run was observed against",
      );
      expect(skill).toContain(
        "**That is the address items 6, 7 and 8 share**, that run being the only observation of the refactored tree taken before the reviews",
      );
      // In the completion reviewers' audit subject: it is what their own
      // `Reviewed revision` is checked against. The subject moved out of the
      // delegation baseline when that file went over the asset line budget, so
      // this reads the reference the baseline now points at.
      const auditHash = flat(await read(tree, AUDIT_HASH));
      expect(auditHash).toContain("`Refactor verify command` / `result` / `revision`");
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

    it(`${tree}: a parallel run re-takes item 6 and the reviews after the merge`, async () => {
      // A worker takes item 6 and items 7-8 inside its own worktree, so the
      // three agree on that tree's address and not on the merged trunk's. The
      // integration verify re-runs the suite; it writes nothing back into the
      // item's evidence, so without this the item ships a PASS taken on a tree
      // that no longer exists.
      const parallel = flat(await read(tree, PARALLEL));
      const reference = flat(await read(tree, REFERENCE));
      const skill = flat(await read(tree, SKILL));

      expect(parallel).toContain("## Re-verify each merged item on the integrated tree");
      expect(parallel).toContain(
        "refresh all three of its `Refactor verify` fields — `command`, `result` and `revision`",
      );
      expect(parallel).toContain(
        "Re-request `completion-reviewer` and `implementation-reviewer` for that item against the same tree",
      );
      expect(reference).toContain(
        "**On a parallel run, item 6 and every review are re-taken after the merge.**",
      );
      expect(skill).toContain(
        "re-take each item's item 6 on the integrated tree and re-request its items 7-8 reviews there",
      );
    });

    it(`${tree}: the post-merge re-take covers a UI item's parity review too`, async () => {
      // The re-take re-requested only the two code reviewers, and the promotion
      // condition read only their PASSes, so a T3 row reached `done` on a
      // `product-surface-reviewer` verdict taken in the worker's worktree —
      // before any sibling slice's stylesheet, layout container or shared
      // component was in the tree. Gate item 9 is what admits a UI item to
      // `done`, and nothing re-observed the rendered output it rules on.
      const parallel = flat(await read(tree, PARALLEL));
      const reference = flat(await read(tree, REFERENCE));
      const skill = flat(await read(tree, SKILL));

      expect(parallel).toContain(
        "**A UI-affecting item re-requests `product-surface-reviewer` there too**, so item 9's PASS names it as well",
      );
      expect(parallel).toContain(
        "that item's re-verify and **every re-review it owes** have returned PASS on the merged tree — `completion-reviewer` and `implementation-reviewer` on every item, and `product-surface-reviewer` as well on a UI-affecting one",
      );
      expect(reference).toContain(
        "item 9's `product-surface-reviewer` review as well on a UI-affecting one",
      );
      expect(skill).toContain(
        "**plus item 9's `product-surface-reviewer` review on a UI-affecting item**",
      );
      // Item 9's review is prototype parity only where a prototype exists.
      // `/qfai-prototyping` rejects `cli`, so naming the re-take "parity"
      // without the carve-out sends a cli orchestrator looking for an artifact
      // that cannot exist and leaves the row permanently un-`done`-able —
      // which is the claim `discussionSkillTemplateIntegration.test.ts` checks
      // over every parity line in `SKILL.md`. All three surfaces carry it.
      for (const surface of [parallel, reference, skill]) {
        expect(surface).toContain("cli-only target");
      }
      // Over-correction pin: the parity review is added to the re-take, not
      // substituted for the two code reviews every merged item still owes.
      expect(parallel).toContain(
        "Re-request `completion-reviewer` and `implementation-reviewer` for that item against the same tree",
      );
    });

    it(`${tree}: the reconciliation write walks listed edges from todo`, async () => {
      // Workers never touch the trunk ledger, so a dispatched row is still
      // `todo` when the reconciliation write lands. Assigning the returned
      // status there is one jump — `todo -> refactor` for the held `done`, or
      // `todo -> done` without the hold — and neither is in the ledger's
      // enumeration, which says it is complete. A wholly successful parallel
      // run was therefore recorded by a prohibited transition.
      const parallel = flat(await read(tree, PARALLEL));
      const ledger = flat(await read(tree, LEDGER));
      const skill = flat(await read(tree, SKILL));

      expect(parallel).toContain(
        "**The reconciliation write replays the row's own path, one listed edge at a time.**",
      );
      expect(parallel).toContain(
        "`todo -> refactor` and `todo -> done` are both absent from `execution-ledger.md#allowed-transitions`",
      );
      expect(parallel).toContain(
        "`todo -> red` on its RED, `red -> green` on its GREEN, `green -> refactor` on its refactor-verify",
      );
      expect(parallel).toContain(
        "Every other returned status is reached by continuing the same replay to it, never by jumping",
      );
      expect(skill).toContain(
        "**That write replays the row's own path one listed edge at a time**",
      );
      // Over-correction pin: the fix is the replay, not a new edge. The ledger
      // enumeration must still not carry a jump out of `todo` past `red`.
      expect(ledger).toContain("`todo` -> `red` (write a failing test)");
      expect(ledger).not.toContain("`todo` -> `refactor`");
      expect(ledger).not.toContain("`todo` -> `done`");
      expect(ledger).toContain("Any edge not listed above is prohibited.");
    });

    it(`${tree}: the checkpoint seal names the checkpoint's own revision`, async () => {
      // The seal was bound to "the `Revision` this run was made against", and
      // `Revision` is a round field addressing the pre-refactor tree, while the
      // per-item boundary runs after every reviewer PASS. There was no
      // checkpoint-owned address, so a producer either sealed a final-tree run
      // with a pre-refactor address or dragged item 5's forward to match.
      const checkpoint = flat(await read(tree, CHECKPOINT));
      const reference = flat(await read(tree, REFERENCE));
      const round = flat(await read(tree, ROUND));
      const skill = flat(await read(tree, SKILL));

      expect(checkpoint).toContain(
        "`Checkpoint verification result`, `Checkpoint verification revision` and `Checkpoint verification seal`",
      );
      expect(checkpoint).toContain("**The revision is this run's own**");
      expect(checkpoint).toContain(
        "It is not a round block's `Revision`: `round-evidence.md` scopes that field to a round and it addresses the pre-refactor tree",
      );
      expect(checkpoint).toContain(
        "The seal is the audit hash over the command and the result together with that revision",
      );
      // The spec-level boundary has no row at all, so it cannot borrow either.
      expect(checkpoint).toContain(
        "together with a `Checkpoint verification revision` of its own, recorded beside them",
      );
      expect(skill).toContain(
        "plus `Checkpoint verification revision`, **this run's own address** and never a round block's `Revision`",
      );
      // The table is what a producer reads to pick the field.
      expect(reference).toContain("| 12 — checkpoint verification passed");
      expect(reference).toContain("**Item 12 takes its address from its own run.**");
      // It is a row-level field, so `round-evidence.md` gives it no prefix.
      expect(round).toContain(
        "the checkpoint fields, the pair with its `Checkpoint verification revision` and seal",
      );
      // Over-correction pin: item 6 keeps `Refactor verify revision`; the
      // checkpoint gets a field of its own rather than taking that one over.
      expect(checkpoint).toContain("It is not borrowed from `Refactor verify revision` either");
      expect(reference).toContain(
        "| `Refactor verify revision`, beside `Refactor verify command` / `result`",
      );
    });

    it(`${tree}: a branch-2 RED address is round-prefixed in the table`, async () => {
      // The table paired a prefixed `Round N: RED revision` with an unprefixed
      // `Falsifiability revision` in one cell, so a producer read the second as
      // row-level. A branch-2 row past Round 2 then either overwrote Round 1's
      // mutation address or stranded the new one outside every round block.
      const reference = flat(await read(tree, REFERENCE));
      const round = flat(await read(tree, ROUND));

      expect(reference).toContain(
        "`Round N: RED revision`, or `Round N: Falsifiability revision` on a branch-2 row",
      );
      expect(reference).toContain(
        "`Round N: RED revision` beside the RED pair, `Round N: Falsifiability revision` beside the trio, `Round N: Revision` beside the GREEN pair",
      );
      // The prefix rule itself is stated once, in the cardinality authority.
      expect(round).toContain(
        "`Round N: Falsifiability revision` **in place of `Round N: RED revision`** as that trio's address",
      );
      expect(round).toContain(
        "the RED pair with `RED revision` and `RED test hash` (or, in their place, the falsifiability trio with `Falsifiability revision`)",
      );
      // Over-correction pin: `Refactor verify revision` is row-level and must
      // NOT acquire a prefix from this sweep.
      expect(round).toContain(
        "the refactor-verify fields — the pair and its `Refactor verify revision`",
      );
      expect(reference).not.toContain("`Round N: Refactor verify revision`");
    });

    it(`${tree}: a worker's returned done is held at refactor until the re-take passes`, async () => {
      // The reconciliation write happens before the integration verify, so a
      // worker's `done` written verbatim settles completion ahead of the
      // post-merge re-verify and re-reviews — and settles it irreversibly,
      // because `done -> refactor` and `done -> review-fix` are not in the
      // allowed-transition list. The failure remedy would then be unrecordable.
      const parallel = flat(await read(tree, PARALLEL));
      const reference = flat(await read(tree, REFERENCE));
      const skill = flat(await read(tree, SKILL));

      expect(parallel).toContain("**A returned `done` is written as `refactor`, not as `done`.**");
      expect(parallel).toContain(
        "The orchestrator writes `refactor -> done` only once the integration verify, that item's re-verify and **every re-review it owes** have returned PASS on the merged tree",
      );
      expect(skill).toContain("**A worker's returned `done` is written as `refactor`**");
      expect(reference).toContain(
        "the orchestrator writes a worker's returned `done` into the trunk as `refactor` and promotes it only after the re-take passes (`parallelization-policy.md#ledger-ownership`)",
      );
    });

    it(`${tree}: the failed re-verify remedy names only listed edges`, async () => {
      // Over-correction pin: the remedy must stay expressible. It has to name
      // an edge the ledger actually carries (`refactor -> review-fix`), and it
      // must not reintroduce a move out of `done`.
      const parallel = flat(await read(tree, PARALLEL));
      const ledger = flat(await read(tree, LEDGER));

      expect(parallel).toContain(
        "leave the row at the `refactor` the reconciliation write held it at, or move it `refactor -> review-fix`",
      );
      expect(parallel).not.toContain("and return the row to `refactor` or `review-fix`");
      // The two edges the old remedy needed are still absent upstream, which is
      // why the hold — and not a new edge — is the fix.
      expect(ledger).not.toContain("`done` -> `refactor`");
      expect(ledger).not.toContain("`done` -> `review-fix`");
      expect(ledger).toContain("`refactor` -> `review-fix`");
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
