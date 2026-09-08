/**
 * One ledger, one write point per cell, stated the same way everywhere.
 *
 * `/qfai-implement` names the moment each cell is written in three places: the
 * Orchestrator Protocol mandates the write, `### Completion` confirms it
 * happened, and `references/parallelization-policy.md` says who performs it
 * when the phases run inside a worker. This file is where the three are
 * compared; nothing else reads them together, and apart they can name
 * different moments and different cells while each reads as correct on its own.
 *
 * What that costs is invisible until a run is interrupted. A cell whose write
 * point is the end of the run is unwritten for every row that ran before it,
 * so the file's own recovery passages — the `review-fix` pickup, the
 * unreconciled-ledger warning, the checkpoint boundary — read a ledger saying
 * nothing was done. A cell no rule assigns to anyone is worse: it is simply
 * absent, and the gate requiring it fails a spec with no visible fault.
 *
 * These cases hold the three statements to one reading.
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
    // The spelling that reads as "write the ledger here" instead, which is
    // what makes the step the first write rather than the check on it.
    expect(skill).not.toContain(
      "update `test-list.md` with final Status, DR-ID, Evidence and Blocked-By values",
    );
  });

  it("gives Blocked-By the write point the ledger's own transitions imply", async () => {
    // The ledger admits an edge to `blocked` from any active status, and the
    // cell records the status the row is leaving. Named as `todo -> blocked`,
    // the writer contract covered only a row parked before it started: one
    // stopped at `red`, `green`, `refactor` or `review-fix` had no writer for
    // a cell its own gate then required of it.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "`Blocked-By` at the `active status -> blocked` transition that fills it",
    );
    expect(skill).toContain(
      "`Blocked-By`, written in the same edit as the status at whichever `active status -> blocked` transition the row takes",
    );
    expect(skill).not.toContain(
      "`Blocked-By`, written at the `todo -> blocked` transition rather than per phase",
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
    // A two-cell mandate leaves `DR-ID` with no per-phase owner, so the cell
    // is unwritten for every row that reaches `exception` before the run ends.
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
    // A parallel worker cannot write the ledger and Completion only
    // reconciles, so this reconcile is the only write a merged row gets. A
    // cell it omits is written by nobody: an `exception` row lands without the
    // `DR-*` its own gate requires.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "Write every cell a worker reports — `Status`, `DR-ID`, `Evidence`, and `Blocked-By` when the worker parked the row — for every merged item",
    );
    expect(skill).not.toContain("Write Status + Evidence for every merged item");
    expect(skill).toContain("TDDLIST_EXCEPTION_MISSING_DR");

    const policy = await read(
      tree,
      "assistant/skills/qfai-implement/references/parallelization-policy.md",
    );
    expect(policy).toContain("`DR-ID` whenever the row carries one");
    // Every cell the worker reports, because the reconcile is the only write
    // those rows get. `Blocked-By` is among them when the worker took an edge
    // to `blocked` inside its slice: the edge is the orchestrator's in serial
    // mode because that is where it happens, and under parallel dispatch it
    // happens in the worker.
    expect(policy).toContain("**every cell a worker reports**, not Status and Evidence alone");
    // From whatever status the worker had reached, not from `todo` alone. The
    // ledger admits an edge to `blocked` from any active status, so a row
    // parked mid-phase is left with no writer for a cell its own gate requires.
    expect(policy).toContain("took an edge to `blocked` inside its slice");
    expect(policy).not.toContain("took the `todo -> blocked` edge inside its slice");
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
    // Unqualified, the same sentence claims the guarantee for parallel mode,
    // where a `todo` row after an interruption means "not merged" rather
    // than "never attempted".
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
    expect(policy).toContain("ask the trunk whether that head is an ancestor of it");
    // The zero-commit case comes first. A worker interrupted before its first
    // commit leaves the head at the dispatch base, which is an ancestor of the
    // trunk by construction — so ancestry alone calls an untouched slice
    // merged, and a row nobody attempted goes to the stop below for good.
    expect(policy).toContain("**Head is the dispatch base**");
    expect(policy).toContain("the worker made no commit");
    // Both answers, and the case that has neither.
    expect(policy).toContain("**An ancestor, and the head moved** — merged. Do not re-dispatch");
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
