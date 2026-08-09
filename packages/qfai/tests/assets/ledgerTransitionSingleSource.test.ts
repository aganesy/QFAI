/**
 * `references/execution-ledger.md#allowed-transitions` is the ledger's
 * transition table. `qfai-implement/SKILL.md` summarised it four times, and the
 * summaries fell behind it: three of them claimed a *unique* re-entry
 * (`refactor` -> `red`), so `blocked` -> `todo`, `exception` -> `todo` and the
 * reviewer loop read as illegal to anyone working from the skill alone. The
 * `project_memory` restatement was the worst placed of them, because it is the
 * line most likely to be carried into a delegated work order.
 *
 * `TDDLIST_EXCEPTION_PARKED` then remediates via `exception` -> `todo`, an edge
 * the skill never named — so the tool appeared to ask for something the skill
 * forbids.
 *
 * These tests pin the reference as the single source: the skill may state the
 * forward spine, but it must not claim the set of re-entries is smaller than it
 * is, and the finding must cite where the real list lives.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("no longer claims a single or only re-entry", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).not.toContain("The single re-entry is");
    expect(skill).not.toContain("with one recorded re-entry");
  });

  it("routes the reader to the reference for the complete list", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("`references/execution-ledger.md#allowed-transitions` is the complete");
    expect(skill).toContain(
      "**Never infer that an edge does not exist from its absence in this summary**",
    );
  });

  it("names the anomaly exit and says it needs no Change Request", async () => {
    // The gap that let a parked row sit forever: SKILL.md contained no
    // `exception -> todo` at all, so its "backward transitions need an approved
    // CR" sentence was the only nearby rule and read as a prohibition.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("leaves via `exception` -> `todo` once the anomaly is resolved");
    expect(skill).toContain("That exit needs no Change Request");
  });

  it("keeps the CR reset as the sanctioned backward transition, and defines the term", async () => {
    // The reset sentence stays — under the reference's vocabulary a resumption
    // and an anomaly exit are re-entries rather than backward transitions, so
    // the sentence is true. What was missing is that the term is narrower than
    // "moves to an earlier status", which is how a reader takes it.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "The only exception is an approved Change Request reset (see Status Lifecycle).",
    );
    expect(skill).toContain('"Backward" is the reference\'s term of art');
  });

  it("the reference still carries every edge the summary defers to it", async () => {
    const ledger = flat(await read(tree, LEDGER));
    for (const edge of [
      "`blocked` -> `todo`",
      "`exception` -> `todo`",
      "`refactor` -> `review-fix`",
      "`review-fix` -> `refactor`",
      "`refactor` -> `red`",
    ]) {
      expect(ledger).toContain(edge);
    }
  });

  it("says `any status` in the complete list, not only in the summary table", async () => {
    // The list declares itself complete and prohibits every unlisted edge, so
    // it is the binding statement — widening only the table below left the
    // legality of a `blocked` or `review-fix` reset depending on which of the
    // two a reader reached first.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("- **Any status** -> `todo` — **upstream reset**");
    expect(ledger).toContain("`blocked` and `review-fix` included");
    expect(ledger).not.toContain(
      "`red` \\| `green` \\| `refactor` \\| `done` \\| `exception` -> `todo` — **upstream",
    );
  });

  it("numbers the sanctioned backward transition as the row it actually is", async () => {
    // The table lists the reset third and `refactor -> red` fourth. Calling the
    // reset "the fourth" made QA rejection recovery read as the sanctioned
    // backward transition, and contradicted the paragraph below it.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("The third, the approved Change Request reset");
    expect(ledger).toContain("The first, second and fourth rows are **re-entries");
  });
});

describe.each(TREES)("%s (the summary cannot license what the list forbids)", (tree) => {
  it("admits every reset source, and gates it on the approval", async () => {
    // The five-source enumeration was chosen to stop an agent writing
    // `review-fix -> todo`, whose ordinary exit is `refactor`. It cost more
    // than it bought: `drift-protocol.md` step 5 sweeps the ledger with
    // `any status -> todo`, so a row at `blocked` or `review-fix` when the
    // upstream obligation moved is one this table forbade the Protocol from
    // sweeping — a preflight with nothing legal left to do. What keeps the
    // wildcard from licensing an unapproved `review-fix -> todo` is the
    // approval column, not a shorter source list.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("| **any status** -> `todo` (upstream reset)");
    expect(ledger).toContain("The reset admits every source status");
    expect(ledger).toContain("a row sitting at `blocked` or `review-fix`");
    // The wildcard is legal only with the approval that makes it a reset.
    const resetRow = ledger.slice(ledger.indexOf("| **any status** -> `todo`"));
    expect(resetRow.slice(0, 200)).toContain("approved `CR-*`");
  });

  it("classifies the approved reset once, not twice", async () => {
    // The table header asked "why it is not backward" of all four rows while
    // the paragraph under it called the reset the only sanctioned backward
    // transition — one edge, two verdicts. Resolved towards the established
    // vocabulary: "backward" is narrow, the reset is its one instance, and the
    // column asks why each edge is *legal* instead.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("| Edge | Why it is legal | Approval needed |");
    expect(ledger).not.toContain("| Why it is not backward |");
    expect(ledger).toContain("three of them are not, one of them is and is authorised");

    // And the checklist a completion report is written against carries the
    // carve-out, so performing an approved reset does not make it unanswerable.
    const checklist = flat(
      await read(tree, "assistant/skills/qfai-implement/references/final-checklist.md"),
    );
    expect(checklist).toContain("other than an approved Change Request reset");
  });

  it("requires a new DR-ID for a second anomaly on the same row", async () => {
    // The retained `DR-*` documents an anomaly already resolved, and
    // `TDDLIST_EXCEPTION_MISSING_DR` only asks that the cell be non-empty with
    // resolvable tokens — so the stale id alone passed the gate while the
    // current anomaly had no Decision Record at all.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "**A row that enters `exception` again records a new `DR-*` for the new anomaly**",
    );
    expect(ledger).toContain("appended, not substituted");
  });

  it("does not let the skill summary restart a changed obligation", async () => {
    // The constraint asserted `exception -> todo` needs no Change Request
    // unconditionally. When the investigation finds the obligation itself was
    // wrong, that is an upstream change — and this line is read before the
    // Exception Handling section that says so.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("**when the row's approved obligation is unchanged**");
    expect(skill).toContain("**When the investigation finds the obligation itself was wrong**");
  });
});
