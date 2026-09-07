/**
 * `/qfai-implement` named two different moments for the same ledger write.
 *
 * `### Completion` step 1 said "After processing all items, update
 * `test-list.md` with final Status, DR-ID and Evidence values", which reads as
 * the moment the ledger is first populated — every row that ran before it
 * unrecorded. The Orchestrator Protocol said the opposite: write after each
 * phase completes. An interrupted run following the former leaves the file's
 * own recovery passages (`review-fix` pickup, the unreconciled-ledger warning,
 * the checkpoint boundary) nothing to read.
 *
 * The two rules also disagreed on cells: Completion named three, the per-phase
 * mandate named two. `DR-ID` therefore had no per-phase write point, so a row
 * that entered `exception` mid-run stayed observable with an empty `DR-ID`
 * until the end of the run — while `references/execution-ledger.md` requires a
 * `DR-*` for every `exception` row.
 *
 * These tests pin Completion as a reconciliation pass and `DR-ID` as a
 * per-phase write.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("reads Completion step 1 as a reconciliation pass, not the first write", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "After processing all items, confirm every row's `Status`, `DR-ID`, `Evidence` and `Blocked-By` match the writes the Orchestrator Protocol mandates",
    );
    // The old spelling is the one that reads as "write the ledger here".
    expect(skill).not.toContain(
      "update `test-list.md` with final Status, DR-ID, Evidence and Blocked-By values",
    );
  });

  it("says in Completion that the ledger was already written", async () => {
    // Without this the reworded step still leaves open *when* the values got
    // there, which is the ambiguity the two rules created.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("not the ledger's first write");
  });

  it("gives DR-ID a per-phase write point in the Orchestrator Protocol", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "update `test-list.md` **Status, DR-ID and Evidence** after each phase completes",
    );
    // The two-cell spelling is what left `DR-ID` with no owner until the end.
    expect(skill).not.toContain("update `test-list.md` **Status and Evidence** after each phase");
  });

  it("ties the DR-ID write to the transition that needs it", async () => {
    // `exception` is the only status that requires the cell
    // (`references/execution-ledger.md`), so the write point has to be that
    // transition, not the end of the run.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "A row that transitions to `exception` takes its `DR-ID` in that same write",
    );
  });

  it("does not make DR-ID a function of the status the row is left at", async () => {
    // The cell carries two ids on different terms
    // (`references/execution-ledger.md`): a `DR-*` that an `exception` row is
    // invalid without, and a `CR-*` that an approved Change Request puts there
    // and the row keeps through every later status. Reading the column off the
    // final status alone loses the second — a reconciler comparing a `done` row
    // against "no status requires this cell" empties it.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "**`DR-ID` holds the `DR-*` a row left at `exception` is invalid without, and holds a `CR-*` at whatever status the row is left at**",
    );
    expect(skill).toContain("the row keeps it through every later status");
    // Only `Blocked-By` follows the status by itself, which is why the two
    // cells cannot share one sentence.
    expect(skill).not.toContain(
      "`DR-ID` and `Blocked-By` are required by the status the row is left at",
    );
  });

  it("carries DR-ID through the parallel reconcile, the one write left", async () => {
    // A parallel worker cannot write the ledger, and Completion now only
    // reconciles — so a reconcile spelled "Status + Evidence" leaves an
    // `exception` row's mandatory `DR-*` written by nobody at all.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "Write `Status`, `DR-ID` and `Evidence` — the three cells a worker reports, and three of the four the Drift Protocol carves out unconditionally — for every merged item",
    );
    expect(skill).not.toContain("Write Status + Evidence for every merged item");
    expect(skill).toContain("TDDLIST_EXCEPTION_MISSING_DR");

    const policy = await read(
      tree,
      "assistant/skills/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain("`DR-ID` where the item's status requires one");
    // The three are what a worker reports. They are three of the four the
    // carve-out covers unconditionally — `Blocked-By` is the fourth and is
    // written at the `todo -> blocked` transition, which a merged slice has
    // not taken — and `Test file` / `Selector` are writable only while their
    // condition holds.
    expect(policy).toContain("**the three cells a worker reports**, not Status and Evidence alone");
    // Serial mode returns the same three; it has no merge step, not a
    // different contract.
    expect(policy).toContain(
      "returns `Status`, `DR-ID` and `Evidence`, the orchestrator writes them",
    );
  });

  it("claims the interruption guarantee for serial mode only", async () => {
    // The per-phase write is what makes an interrupted run leave a current
    // ledger, and a parallel worker cannot perform it: it may not write the
    // file and it reports once, at the end of its slice. Claiming the
    // guarantee unconditionally told a reader that a `todo` row after an
    // interrupted parallel run meant "never attempted".
    const skill = await read(tree, SKILL);
    expect(skill).toContain("in serial mode a row is written when its phase completes");
    expect(skill).toContain(
      "**Under coordinated parallel dispatch that currency is not available and this step does not supply it**",
    );
    // The unqualified spelling is the claim that was false for parallel mode.
    expect(skill).not.toContain("first write: a row is written when its phase completes");
    // The per-phase mandate carries the same qualifier, so the two rules do
    // not disagree again the way this file's docblock describes.
    expect(skill).toContain("That per-phase cadence is the **serial** write point");
  });

  it("says why parallel mode cannot write per phase, and what recovery is instead", async () => {
    const policy = await read(
      tree,
      "assistant/skills/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain(
      "**Per-phase writes are a serial-mode property, and parallel mode does not have them.**",
    );
    // Both reasons, because either alone reads as a gap to close by contract.
    expect(policy).toContain(
      "A worker **cannot** write the ledger, and it reports **once** — at the end of",
    );
    expect(policy).toContain("The trunk row **must not** advance before its slice merges");
    // And the reading a `todo` row gets after an interrupted parallel run.
    expect(policy).toContain("recovery is re-dispatching the unmerged slices");
    expect(policy).toContain('as "not merged", not as "not attempted"');
  });

  it("tests the slice head, not the row status, before re-dispatching", async () => {
    // Merging a slice and writing the ledger are two steps. Interrupted
    // between them, the code is in the trunk and the row is still `todo` —
    // indistinguishable from a slice that never merged, so a rule keyed on the
    // status alone applies the same change twice.
    const policy = await read(
      tree,
      "assistant/skills/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain("**Check the slice head before re-dispatching it.**");
    expect(policy).toContain("ask the trunk whether the slice head is an ancestor of it");
    // Both answers, and the case that has neither.
    expect(policy).toContain("**Already merged** — do not re-dispatch");
    expect(policy).toContain("Reconcile the ledger alone, from the returned report");
    expect(policy).toContain("A slice with no returned report");
  });

  it("returns DR-ID from every agent that reports a ledger entry", async () => {
    // The orchestrator is the only writer, so a cell no agent returns is one
    // nobody can write. An `exception` row without its `DR-*` is invalid.
    for (const agent of ["backend-engineer", "frontend-engineer", "acceptance-test-engineer"]) {
      const doc = await read(tree, `assistant/agents/${agent}.md`);
      expect(doc, `${agent} does not return DR-ID`).toContain(
        "TDD ledger `Status`, `DR-ID` and `Evidence` entry for each item processed",
      );
      expect(doc, `${agent} still names the two-cell payload`).not.toContain(
        "TDD ledger Status + Evidence entry",
      );
    }
    const policy = await read(
      tree,
      "assistant/skills/qfai-implement/references/parallelization-policy.md",
    );
    // Serial mode returns the same three; it has no merge step, not a
    // different payload.
    expect(policy).not.toContain("returns Status + Evidence after");
  });
});
