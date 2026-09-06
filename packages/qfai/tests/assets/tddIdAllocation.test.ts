/**
 * `TDD-NNNN` has an allocation rule (#405).
 *
 * The shipped specification for `TDD-ID` was one line — match `TDD-NNNN`, be
 * unique within the spec — while `constitution/workflow.md` mandates worktree
 * separation and `TDDLIST_DUPLICATE_ID` is an `error`. Nothing said who
 * allocates the next value, so a batch of rows could only be landed by the last
 * writer.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("TDD-ID allocation", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the traceability rules state who allocates the next TDD-ID`, async () => {
      const rules = flat(await read(tree, RULES));

      // The uniqueness constraint is still the premise the rule hangs off.
      expect(rules).toContain("`TDD-ID` must match `TDD-NNNN` and be unique within the spec.");
      expect(rules).toContain(
        "**`TDD-ID` allocation is by reserved block, decided before the workers split.**",
      );
      // Serial authoring is unchanged, and says what the maximum ranges over.
      expect(rules).toContain(
        "Take the maximum `TDD-NNNN` over the whole ledger, including retired, `blocked` and `exception` rows",
      );
      // A reserved-but-unwritten block has no rows yet, so rows alone are not
      // the high-water mark.
      expect(rules).toContain(
        "**and the upper bound of every bullet under `## TDD-ID reservations`**",
      );
      // `max` over an empty set is undefined, and Phase 2b seeds every ledger
      // empty — the base case is the most common allocation there is.
      expect(rules).toContain("**An empty candidate set has a maximum of 0**");
      expect(rules).toContain("the first row a freshly seeded ledger takes is `TDD-0001`");
      // `TDD_ID_FORMAT` is /^TDD-\d{4}$/, so `max + 1` has a ceiling.
      expect(rules).toContain("**`TDD-9999` is the last legal id**");
      // A single-id bullet is a legal high-water carrier, not only a block.
      expect(rules).toContain("A bullet that names a single id has that id as its upper bound");
    });

    it(`${tree}: the ceiling has a legal exit for a single-capability spec`, async () => {
      const rules = flat(await read(tree, RULES));

      // "split the spec" is not reachable for the common shape:
      // validateSpecSplitByCapability rejects a count-driven SPLIT of a
      // single-capability spec, so the ceiling would deadlock.
      expect(rules).toContain("**the spec owns exactly one capability → SUPERSEDE, not SPLIT.**");
      expect(rules).toContain("`QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error`");
      expect(rules).toContain("`Superseded-by: spec-NNNN`");
      expect(rules).toContain("the successor's ledger allocates from the empty base case");
      // SPLIT is still correct when the spec really owns several capabilities.
      expect(rules).toContain("more than one `CAP-NNNN` → **SPLIT**");
      // Widening TDD_ID_FORMAT is still off the table.
      expect(rules).toContain("never by widening the format on your own");
    });

    it(`${tree}: a deleted row keeps its id as a high-water tombstone`, async () => {
      const rules = flat(await read(tree, RULES));

      // The Drift Protocol deletes such a row, so the id leaves the table and
      // `max + 1` walks back onto it.
      expect(rules).toContain("**A deleted row leaves its id behind the same way.**");
      expect(rules).toContain(
        "- ~~TDD-0002~~ — row deleted <YYYY-MM-DD>, obligation removed by <ref>",
      );
      expect(rules).toContain("a serially allocated row never had a bullet to close");

      // The write point has to carry the obligation, or nothing writes it.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(drift).toContain("A row whose obligation was deleted outright is removed, not reset");
      expect(drift).toContain("record that id as a tombstone bullet");
      expect(drift).toContain("or the next allocation reissues it");
    });

    it(`${tree}: the rule names the race it closes`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("`TDDLIST_DUPLICATE_ID` is an `error`");
      expect(rules).toContain("worktree separation");
      expect(rules).toContain("stale the moment another author appends");
    });

    it(`${tree}: reservation is one serialized write on the shared branch`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("**Concurrent authoring — reserve first, on the shared branch.**");
      expect(rules).toContain("one serialized write on the branch they all fork from");
      expect(rules).toContain("`## TDD-ID reservations`");
      // The reservation must not be readable as ledger rows.
      expect(rules).toContain(
        "Record it as a bullet list, never a markdown table: `validateTddList` reads every table in the file as ledger rows",
      );
      expect(rules).toContain("- TDD-0065..TDD-0079 — <author or slice>, reserved <YYYY-MM-DD>");
    });

    it(`${tree}: an author with no reservation may take one itself`, async () => {
      const rules = flat(await read(tree, RULES));

      // The observed failure had no dispatcher at all: the rows were parked.
      expect(rules).toContain(
        "If no reservation exists and you need IDs anyway, take one yourself",
      );
      expect(rules).toContain("it serializes where a batch of rows cannot");
      // Picking a range in your own worktree is the same stale read; only the
      // push serializes it, and no validator catches two overlapping bullets.
      expect(rules).toContain("**What serializes it is the push, not the commit**");
      expect(rules).toContain(
        "**if the push is rejected, fetch and recompute the block from the new tip before retrying**",
      );
      expect(rules).toContain("`validateTddList` never looks at reservation bullets");
      expect(rules).toContain(
        "**A bullet that overlaps one already on the shared branch is invalid**",
      );
    });

    it(`${tree}: gaps are kept and written IDs are never renumbered`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("**A block is a budget, not a promise.**");
      expect(rules).toContain("stops and asks for another one; it does not continue past the");
      // Deleting a spent bullet would hand its unused tail back to `max + 1`.
      expect(rules).toContain("**The reservation bullet is never deleted**");
      expect(rules).toContain("- ~~TDD-0065..TDD-0079~~ — <author or slice>, closed <YYYY-MM-DD>");
      expect(rules).toContain("**A written `TDD-ID` is never renumbered.**");
      // Renumbering at merge time is what breaks the out-of-ledger references.
      expect(rules).toContain(".qfai/evidence/atdd-*.md");
      expect(rules).toContain(
        "a merge does not rewrite it, so renumbering at merge time silently breaks those references",
      );
    });

    it(`${tree}: the ledger schema carries the rule where rows are appended`, async () => {
      const ledger = flat(await read(tree, LEDGER));

      // The column gloss no longer stops at "unique".
      expect(ledger).toContain("Allocated per `#tdd-id-allocation`");
      expect(ledger).toContain("## TDD-ID allocation");
      expect(ledger).toContain("`max + 1` over every table in the file when authoring serially");
      expect(ledger).toContain(
        "from a block reserved under `## TDD-ID reservations` when authors run concurrently",
      );
      expect(ledger).toContain("Never renumber an id that has already been written outside");
      expect(ledger).toContain(
        "The maximum ranges over the upper bound of every reservation bullet as well, and those bullets are never deleted",
      );
      // The implement-side mirror carries both corrections too.
      expect(ledger).toContain("A deleted row is tombstoned in that same section");
      expect(ledger).toContain(
        "SPLIT when it owns more than one `CAP-NNNN` and SUPERSEDE when it owns exactly one",
      );
    });

    // SUPERSEDE only rolls the ceiling over when it was reached by churn. If
    // the 9999 rows are live coverage-target TCs, the successor inherits the
    // same obligations and Phase 2b refills the empty ledger to the same
    // ceiling before one new obligation is added — so the rule has to separate
    // the two causes instead of offering an exit that gains nothing.
    it(`${tree}: the ceiling separates churn from live volume`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("Both exits assume the ceiling was reached by churn");
      // The measurement that tells the two apart, so this is decidable.
      expect(rules).toContain("count the rows that are still live obligations");
      expect(rules).toContain("At or near it, neither exit gains anything");
      expect(rules).toContain("refills to the same ceiling");
      // The honest exit for the live-volume case, and why SPLIT was refused.
      expect(rules).toContain("decompose the capability");
      expect(rules).toContain("refusing a **single**-`CAP` split, not a count");
      // Widening the format stays a decision with the user, as before.
      expect(rules).toContain("is a package change decided with the user");

      const ledger = flat(await read(tree, LEDGER));
      expect(ledger).toContain("Both exits assume the ceiling came from churn");
      expect(ledger).toContain("the answer is upstream scope, not allocation");
    });

    // An ordinary `/qfai-sdd` removal goes through an `UPDATE:REMOVE` Triage
    // row and raises no Change Request, so a mandatory `<CR-ID>` left that path
    // with nothing true to write — and a tombstone that cannot be written is a
    // reissued id.
    it(`${tree}: the tombstone accepts the rationale each removal path produces`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("obligation removed by <ref>`");
      expect(rules).toContain("**`<ref>` is whatever authorised the removal on the path it took**");
      expect(rules).toContain("raising no Change Request at all");
      expect(rules).toContain("Cite the Triage row's `Source` (`REQ-XXXX`) there");
      expect(rules).toContain("neither may be a placeholder");
      // The old mandatory form is gone from both trees, not merely widened here.
      expect(rules).not.toContain("obligation removed by <CR-ID>");

      // A rule with no write point on this path binds nothing: the CR path had
      // one in the Drift Protocol, the ordinary one had none at all.
      const triage = flat(await read(tree, "assistant/skills/qfai-sdd/references/sdd-triage.md"));
      expect(triage).toContain("Removing a coverage-target `TC` also retires its ledger row");
      expect(triage).toContain("citing this row's `Source`");
      expect(triage).toContain("This path raises no Change Request");

      const ledger = flat(await read(tree, LEDGER));
      expect(ledger).toContain("`Source` (`REQ-XXXX`) on the ordinary `/qfai-sdd` path");
      expect(ledger).not.toContain("obligation removed by <CR-ID>");
    });

    it(`${tree}: the SKILL points at the allocation rule but claims no ownership`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "Allocating a new `TDD-ID` is governed by `references/execution-ledger.md#tdd-id-allocation`",
      );
      expect(skill).toContain("never guess the next value from a ledger another worktree holds");
      // Rows are upstream: this skill owns only Status / DR-ID / Evidence, so
      // the allocation pointer must not read as a licence to append a row.
      expect(skill).toContain("**This skill allocates no `TDD-ID`**");
      expect(skill).toContain("`/qfai-sdd` Phase 2b is their producer");
    });
  }
});
