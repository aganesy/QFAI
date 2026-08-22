/**
 * The final checklist is the skill's last hard stop, but it had drifted away
 * from the gate it is supposed to restate: 10 boxes against a 12-point gate,
 * with both reviewer verdicts, prototype parity, the evidence append, the
 * `Oracle proof` and checkpoint verification asked about nowhere. A spec whose
 * reviews were skipped passed the last sweep cleanly.
 *
 * These tests bind the two documents together so the next gate item cannot
 * drift the same way.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped surface plus its root mirror. */
const SKILL_DIRS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement"),
  path.join(repoRoot, ".qfai/assistant/skills/qfai-implement"),
];

const GATE_HEADING = "### Item completion checklist (12-point gate)";

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (match?.[1]) {
      slugs.add(slug(match[1]));
    }
  }
  return slugs;
}

/** The numbered items of the 12-point gate, by their own numbering. */
function gateItemNumbers(skill: string): number[] {
  const start = skill.indexOf(GATE_HEADING);
  expect(start, `${GATE_HEADING} must exist`).toBeGreaterThanOrEqual(0);
  const rest = skill.slice(start + GATE_HEADING.length);
  const end = rest.indexOf("\n### ");
  const section = end === -1 ? rest : rest.slice(0, end);
  const numbers: number[] = [];
  for (const line of section.split(/\r?\n/)) {
    const match = /^(\d+)\.\s/.exec(line);
    if (match?.[1]) {
      numbers.push(Number(match[1]));
    }
  }
  return numbers;
}

interface ChecklistBox {
  /** The box and its hanging-indent continuation lines, joined. */
  readonly text: string;
  /** Indices into the checklist's lines that the box occupies. */
  readonly lines: readonly number[];
}

/**
 * The task-list boxes only. Surrounding prose is excluded on purpose: the
 * invariant is "every gate item has a box", so a number mentioned in narration
 * must not count as coverage.
 */
function checklistBoxes(checklist: string): ChecklistBox[] {
  const boxes: ChecklistBox[] = [];
  let text: string | null = null;
  let lines: number[] = [];
  const flush = (): void => {
    if (text !== null) {
      boxes.push({ text, lines });
    }
    text = null;
    lines = [];
  };
  checklist.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*- \[[ xX]\]\s/.test(line)) {
      flush();
      text = line.trim();
      lines = [index];
      return;
    }
    if (text !== null && /^\s+\S/.test(line)) {
      text = `${text} ${line.trim()}`;
      lines.push(index);
      return;
    }
    flush();
  });
  flush();
  return boxes;
}

/** Every gate item number a checklist box claims to cover. */
function citedGateItems(checklist: string): Set<number> {
  const cited = new Set<number>();
  for (const box of checklistBoxes(checklist)) {
    for (const match of box.text.matchAll(/gate items?\s+([\d,\s]*\d)/g)) {
      for (const part of (match[1] ?? "").split(",")) {
        const value = Number(part.trim());
        if (Number.isInteger(value)) {
          cited.add(value);
        }
      }
    }
  }
  return cited;
}

/** The checklist with the boxes covering `item` deleted, prose left intact. */
function withoutBoxesCovering(checklist: string, item: number): string {
  const lines = checklist.split(/\r?\n/);
  const dropped = new Set<number>();
  for (const box of checklistBoxes(checklist)) {
    if (citedGateItems(box.text).has(item)) {
      for (const index of box.lines) {
        dropped.add(index);
      }
    }
  }
  return lines.filter((_, index) => !dropped.has(index)).join("\n");
}

const readSkill = async (dir: string): Promise<string> =>
  await readFile(path.join(dir, "SKILL.md"), "utf-8");

const readChecklist = async (dir: string): Promise<string> =>
  await readFile(path.join(dir, "references/final-checklist.md"), "utf-8");

/** Collapse hanging indents so prose assertions survive a rewrap. */
const readChecklistProse = async (dir: string): Promise<string> =>
  (await readChecklist(dir)).replace(/\s+/g, " ");

describe.each(SKILL_DIRS)("%s final checklist", (dir) => {
  it("covers every numbered item of the 12-point gate", async () => {
    // The drift this closes: the gate grew to 12 items while the checklist
    // stayed Red/Green/Refactor-shaped, so 5 items had no box at all.
    const numbers = gateItemNumbers(await readSkill(dir));
    expect(numbers.length).toBeGreaterThanOrEqual(12);
    const cited = citedGateItems(await readChecklist(dir));
    const uncovered = numbers.filter((n) => !cited.has(n));
    expect(uncovered).toEqual([]);
  });

  it("counts a gate item as covered only from a box, never from prose", async () => {
    // Otherwise a number mentioned in narration keeps an item "covered" after
    // its box is deleted — deleting the per-row checkpoint box left item 12
    // cited by the spec-level box's explanation of why it does not apply.
    const checklist = await readChecklist(dir);
    for (const n of gateItemNumbers(await readSkill(dir))) {
      const cited = citedGateItems(withoutBoxesCovering(checklist, n));
      expect([...cited], `gate item ${n} survives its box's deletion`).not.toContain(n);
    }
  });

  it("asks for both reviewer verdicts and their evidence append", async () => {
    // `Do not declare DONE until Reviewer returns PASS` is never waived, yet
    // the list told to be checked last never named a reviewer.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain(
      "`completion-reviewer` and `implementation-reviewer` returned PASS",
    );
    expect(checklist).toContain("appended to the evidence file the row's `Layer` owns");
    expect(checklist).toContain("leaving 0 blocking reviewer issues");
    expect(checklist).toContain("`product-surface-reviewer` prototype-parity PASS");
  });

  it("asks for the Oracle proof, not just a passing test", async () => {
    // Exit code 0 alone does not separate a discriminating test from a vacuous
    // one — the half-box asked only "test confirmed to pass".
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("`Oracle proof`");
    expect(checklist).toContain("equivalent-mutant");
    expect(checklist).toContain("one that cannot fail");
  });

  it("asks for the admissible RED and the resolved Evidence anchor", async () => {
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**admissible**");
    expect(checklist).toContain("`Evidence` anchor resolves");
    expect(checklist).toContain("`Audited evidence hash`");
  });

  it("asks for the spec-level checkpoint boundary gate item 12 never reaches", async () => {
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain(
      "Spec-level checkpoint verification ran against the terminal ledger",
    );
    expect(checklist).toContain("`Checkpoint verification seal` recomputes");
    // A correctly sealed FAIL is still a FAIL: "ran" alone would let a
    // non-zero formatter / linter / type-check result through.
    expect(checklist).toContain("terminal ledger and **passed**");
  });

  it("scopes each waiver and exception to what its gate item actually grants", async () => {
    const checklist = await readChecklistProse(dir);
    // `red-not-observable.md` waives item 4 only — GREEN must still be observed.
    expect(checklist).toContain(
      "the waiver reaches the **minimal-code clause only** (gate item 4)",
    );
    // Gate item 10's marker-based legacy evidence location stays valid.
    expect(checklist).toContain("`Pre-split-evidence: implement`");
    // Gate item 12 is not boundary-only: off a boundary the narrow suite carries it.
    expect(checklist).toContain("narrow relevant suite from Phase: Refactor step 2");
  });

  it("requires a terminal status on every row, not merely an accurate one", async () => {
    // "Statuses are accurate" is satisfiable by a run that advanced nothing: a
    // `todo` / `review-fix` row left over from the previous run is recorded
    // correctly, every reviewer/checkpoint box is vacuously true over the empty
    // set of rows advanced this run, and the spec is declared complete anyway.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("Every ledger row reached a **terminal** status");
    expect(checklist).toContain(
      "No `todo`, `red`, `green`, `refactor` or `review-fix` row remains",
    );
    // The `exception` half is the waiver, not a bare DR that names the anomaly.
    expect(checklist).toContain("user-approved accepted-risk waiver");
    expect(checklist).toContain("`TDDLIST-001`");
  });

  it("recomputes the handed-over RED test hash, not just the evidence seals", async () => {
    // Anchor, `Review pack seal` and `Audited evidence hash` all address the
    // evidence entry. A fixture or test body edited after `/qfai-atdd` observed
    // the RED moves none of them, so the row completes on stale provenance.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("`Round N: RED test hash` **recomputes**");
    expect(checklist).toContain("over the manifest recorded beside it, and matches");
    expect(checklist).toContain("`Shared-artifact re-verify`");
  });

  it("refuses completion while a cross-spec obligation is still open", async () => {
    // Local rows, TC coverage, checkpoints and CRs can all pass while another
    // spec's `done` rows certify a behaviour this run changed and nobody
    // re-verified — a completion prohibition in its own right.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("No `## Cross-spec obligations` entry");
    expect(checklist).toContain("`Resolution` reads `re-reviewed` or names a `CR-*`");
  });

  it("requires the post-merge verify and seam reconciliation after a parallel run", async () => {
    // Authorized dispatch is the precondition, not the obligation: the merged
    // trunk carries none of the workers' transitions, and a green merged suite
    // is exactly the case seam reconciliation exists to see past.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("ran as a parallel slice");
    expect(checklist).toContain("no merged item's row still `todo`");
    expect(checklist).toContain("integration verify ran on the **merged** result and passed");
    expect(checklist).toContain("whether or not the merged suite is green");
  });

  it("states the derivation rule that keeps the two in sync", async () => {
    // Without it the next gate item drifts the same way.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**Derivation rule (MUST).**");
    expect(checklist).toContain("SKILL.md#item-completion-checklist-12-point-gate");
    expect(checklist).toContain("SKILL.md#spec-completion-conditions");
    expect(checklist).toContain("SKILL.md#completion-prohibition-conditions");
    expect(checklist).toContain("is a defect in");
    // A box asserts the work is finished, not that the record of it is correct.
    expect(checklist).toContain("A box asserts a **terminal** state");
  });

  it("keeps every anchor it cites resolvable", async () => {
    const checklist = await readChecklist(dir);
    const cited = [...checklist.matchAll(/`([\w.-]+\.md)#([\w-]+)`/g)];
    expect(cited.length).toBeGreaterThan(0);
    for (const [, file, anchor] of cited) {
      if (file === undefined || anchor === undefined) {
        continue;
      }
      const target =
        file === "SKILL.md" ? path.join(dir, file) : path.join(dir, "references", file);
      const slugs = headingSlugs(await readFile(target, "utf-8"));
      expect(slugs, `${file}#${anchor}`).toContain(anchor);
    }
  });
});
