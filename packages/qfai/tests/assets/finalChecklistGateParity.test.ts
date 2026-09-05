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

import { createHash } from "node:crypto";
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
const SPEC_CONDITIONS_HEADING = "### Spec completion conditions";
const PROHIBITIONS_HEADING = "### Completion prohibition conditions";

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

/** The body of one `###` section of `SKILL.md`, heading excluded. */
function skillSection(skill: string, heading: string): string {
  const start = skill.indexOf(heading);
  expect(start, `${heading} must exist`).toBeGreaterThanOrEqual(0);
  const rest = skill.slice(start + heading.length);
  const end = rest.search(/\n#{2,3} /);
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * The top-level `- ` bullets of a section, each joined with its continuation
 * lines and whitespace-collapsed so a rewrap does not change the text.
 */
function sectionBullets(skill: string, heading: string): string[] {
  const bullets: string[] = [];
  for (const line of skillSection(skill, heading).split(/\r?\n/)) {
    if (/^- \S/.test(line)) {
      bullets.push(line.trim());
      continue;
    }
    if (bullets.length > 0 && /^\s+\S/.test(line)) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${line.trim()}`;
    }
  }
  return bullets.map((bullet) => bullet.replace(/\s+/g, " "));
}

/** The numbered items of the 12-point gate, each by its own number. */
function gateItems(skill: string): { number: number; text: string }[] {
  const section = skillSection(skill, GATE_HEADING);
  const items: { number: number; text: string }[] = [];
  for (const line of section.split(/\r?\n/)) {
    const match = /^(\d+)\.\s(.*)$/.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      items.push({ number: Number(match[1]), text: match[2].replace(/\s+/g, " ") });
      continue;
    }
    const last = items[items.length - 1];
    if (last !== undefined && /^\s+\S/.test(line)) {
      last.text = `${last.text} ${line.trim()}`.replace(/\s+/g, " ");
    }
  }
  return items;
}

/** The numbered items of the 12-point gate, by their own numbering. */
function gateItemNumbers(skill: string): number[] {
  return gateItems(skill).map((item) => item.number);
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

/**
 * The numbered half of the derivation rule, contract clause by contract clause.
 *
 * `citedGateItems` only sees an item's *number*, so a gate item reworded while
 * keeping its number — item 7 changed to a different reviewer's gate, say —
 * leaves `uncovered` empty and every downstream assertion reading the checklist
 * rather than `SKILL.md` still green, with the box now restating a contract that
 * no longer exists. These pin the meaning as well: `condition` is a distinctive
 * substring of the `SKILL.md` item, `box` a substring of a checklist box that
 * cites that item's number, and the pairing is asserted in both directions.
 *
 * One item may have several clauses. Every numbered item needs at least one
 * entry, so a 13th gate item fails here until it is mapped too.
 */
const GATE_ITEM_PARITY: readonly {
  readonly item: number;
  readonly condition: string;
  readonly box: string;
}[] = [
  {
    item: 1,
    condition: "Corresponding `TDD-ID` has been selected and is in progress",
    box: "its `TDD-ID` selected and in progress",
  },
  {
    item: 2,
    condition: "A failing test was added first (test-first)",
    box: "test was written first and confirmed to fail",
  },
  {
    item: 2,
    condition: "proven falsifiable by mutation instead of by a natural failure",
    box: "the falsifiability trio replaces the natural RED",
  },
  {
    item: 3,
    condition: "RED was observed — `qa-gatekeeper` confirmed an **admissible** failure",
    box: "`qa-gatekeeper` confirmed the failure is **admissible**",
  },
  {
    item: 4,
    condition: "Minimal production code was written to make the test pass",
    box: "minimal code was written",
  },
  {
    item: 4,
    condition: "**waived** on the _RED not observable_ path",
    box: "the waiver reaches the **minimal-code clause only** (gate item 4)",
  },
  {
    item: 5,
    condition:
      "GREEN was observed — `qa-gatekeeper` confirmed the test passes after implementation",
    box: "`qa-gatekeeper` confirmed the test passes",
  },
  {
    item: 5,
    condition: "`Oracle proof` records a production mutation that made the test fail again",
    box: "`Oracle proof` (or `equivalent-mutant` naming the weaker contract clause) is recorded",
  },
  {
    item: 6,
    condition: "Refactor was performed and GREEN was re-confirmed after refactor",
    box: "code improved with tests still passing, and GREEN re-confirmed after the refactor",
  },
  {
    item: 7,
    condition: "`completion-reviewer` returned PASS (spec / completion review gate)",
    box: "`completion-reviewer` and `implementation-reviewer` returned PASS",
  },
  {
    item: 8,
    condition: "`implementation-reviewer` returned PASS (code quality review gate)",
    box: "`completion-reviewer` and `implementation-reviewer` returned PASS",
  },
  {
    item: 9,
    condition: "UI-affecting items have `product-surface-reviewer` PASS",
    box: "`product-surface-reviewer` PASS",
  },
  {
    item: 9,
    condition:
      "on a cli-only target (see `#visual-review-guard`) a surface review of the captured command output in its place",
    box: "on a cli-only target a surface review of the captured command output in its place",
  },
  {
    item: 10,
    condition: "`test-list.md` Status is current",
    box: "`test-list.md` statuses are accurate",
  },
  {
    item: 10,
    condition:
      "Evidence cell's anchor resolves to a fresh per-item entry in the evidence file its `Layer` owns",
    box: "`Evidence` anchor resolves to a fresh entry in the file its `Layer` owns",
  },
  {
    item: 10,
    condition: "the row carries `Pre-split-evidence: implement` in its `Evidence` cell",
    box: "`Pre-split-evidence: implement` marker",
  },
  {
    item: 10,
    condition: "`Review pack seal` is recomputed here",
    box: "`Review pack seal` and each `Audited evidence hash` recomputed",
  },
  {
    item: 10,
    condition:
      "A verdict carrying a `Record re-attestation` is compared against **that** hash and not the superseded original",
    box: "the `Record re-attestation pack seal` recomputes here beside the round's `Review pack seal`",
  },
  {
    item: 10,
    condition:
      "The item's four sub-agent observations (items 3, 5, 7, 8) all name the **same** revision",
    box: "**agree on the revision the row finally landed at**",
  },
  {
    item: 11,
    condition: "is appended with both reviewer verdicts after items 7-8 returned PASS",
    box: "both verdicts are appended to the evidence file the row's `Layer` owns",
  },
  {
    item: 12,
    condition: "Checkpoint verification passed (see `#checkpoint-verification`)",
    box: "Checkpoint verification passed for **every** row advanced this run",
  },
  {
    item: 12,
    condition:
      "`Checkpoint verification seal` is **recomputed** here over the recorded command, result and revision",
    box: "`Checkpoint verification seal` recomputes over the recorded command, result and revision",
  },
  {
    item: 12,
    condition:
      "The **full** suite is required here only when the item sits on a checkpoint boundary",
    box: "the **full** suite where the row sits on a checkpoint boundary",
  },
];

/**
 * The whole of each numbered item, addressed rather than sampled.
 *
 * `GATE_ITEM_PARITY` matches *substrings*, so it sees a clause it was told
 * about and nothing else: leave gate item 7's existing sentence in place, append
 * a second reviewer condition to it, and every mapped `condition` still matches,
 * the item number still has an entry, `unmapped` is still empty — and the
 * checklist never learns the item grew. That is the same silent drift the
 * derivation rule exists to stop, one rung down: clause-level instead of
 * item-level.
 *
 * No assertion can judge whether prose in a box covers prose in an item, so this
 * does the part that is decidable: it pins the item's normalized text by
 * content, which makes *any* edit to a gate item — an added clause, a reworded
 * obligation, a deleted one — fail here until someone re-reads it against its
 * box, extends `GATE_ITEM_PARITY` and the checklist, and re-pins the digest.
 * `gateItems` folds continuation lines and collapses whitespace first, so a
 * rewrap or a re-indent does not move a digest; only the words do.
 */
const GATE_ITEM_CONTRACT_DIGESTS: Readonly<Record<number, string>> = {
  1: "f8cfaffb0a9d878b17c22abf28aee9d1cedcc99f58b2b81994a9980eb46fd63f",
  2: "49012cdcb1049e7d498e9b1eae4e890081b5b7db6c1cbd7aef9d44c3455776a3",
  3: "7da8876bf5bcf89963e539fc16ddfc411718a17b8e3df90ca14c949fd323c0fc",
  4: "bcba32532c2c863c57d09afdcadcb56df3fa0fbc882488fdb00c28aafcc9521e",
  5: "a1b93900e1dc264e22873e9d3716b6cee62bbdfb9b810afdb905da4fe30a7096",
  6: "aaaff54532bbe37f4bea22f5caa5e661d0c11474558e3ccdc91ba9ff309f7fba",
  7: "fee818c19155095affcd06e2d17aa640d31b23b0dcecd87acaf7414205c04fed",
  8: "afe34136da80789a108e0eb6960a0a7bf21565dc21bffd1dc8863e37bad6c2a3",
  9: "13d73c84383d0ec0c4eb6339eafaa5040ebda31bb56b5adb840ed976bcbc85e8",
  10: "c6f25a8aa00ef2c7bc0a414694d04300648d82af61eb5e36b1b10ad155c70199",
  11: "e4c7de62d79995caf9578da4383a0281b120867d5ffb54246ea541ccbe8d1dba",
  12: "0a4e91b6525964607ac950366ffcd1e2638d34d1c0f4d98ff4b3242cf91d21ee",
};

/**
 * The spec-level half of the derivation rule, condition by condition.
 *
 * `condition` is a distinctive substring of one `SKILL.md` bullet; `box` is a
 * substring of the checklist box that covers it. The pairing is asserted in
 * both directions, so adding a condition (nothing matches it), deleting or
 * rewording one (its `condition` matches nothing) and dropping its box all
 * fail — the numbered gate items get that from `citedGateItems`, and these
 * conditions had no equivalent.
 */
const SPEC_LEVEL_PARITY: readonly {
  readonly heading: string;
  readonly condition: string;
  readonly box: string;
}[] = [
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "with applicable layer are present in `test-list.md`",
    box: "Every applicable `TC-*` from `06_Test-Cases.md` is present in `test-list.md`",
  },
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "`QFAI-ATDD-111` and `QFAI-ATDD-113` are clean for this spec",
    box: "`QFAI-ATDD-111` / `QFAI-ATDD-113` are clean for this spec",
  },
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "Each item reached `done` or valid `exception`",
    box: "Every ledger row reached a **terminal** status",
  },
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "0 blocking reviewer issues remain",
    box: "leaving 0 blocking reviewer issues",
  },
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "Checkpoint verification passed at the spec-level boundary",
    box: "Spec-level checkpoint verification ran against the terminal ledger",
  },
  {
    heading: SPEC_CONDITIONS_HEADING,
    condition: "No unresolved Change Request or waiver dependency exists",
    box: "No in-scope Change Request or waiver dependency is unresolved",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "No RED fresh evidence exists for the item",
    box: "Red phase: test was written first and confirmed to fail",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "No GREEN fresh evidence exists for the item",
    box: "Green phase: minimal code was written",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "has not been run or returned REVISE",
    box: "`completion-reviewer` and `implementation-reviewer` returned PASS",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "does not record both reviewer verdicts for the item",
    box: "both verdicts are appended to the evidence file the row's `Layer` owns",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "A `## Cross-spec obligations` entry in this spec's evidence file is still open",
    box: "No `## Cross-spec obligations` entry",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "Items with `todo`, `red`, `green`, `refactor`, or `review-fix` status still exist",
    box: "No `todo`, `red`, `green`, `refactor` or `review-fix` row remains",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "Items with `exception` status still exist",
    box: "user-approved accepted-risk waiver",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "Parallel slices were used but integration verify has not been run post-merge",
    box: "integration verify ran on the **merged** result and passed",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "A checkpoint boundary was reached",
    box: "Checkpoint verification passed for **every** row advanced this run",
  },
  {
    heading: PROHIBITIONS_HEADING,
    condition: "stubs remain in any file covered by",
    box: "zero `QFAI-TEST-001` findings",
  },
];

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

  it("requires the gate's own numbering to be exactly 1..n, with no repeat", async () => {
    // Coverage alone cannot see a misnumbering: write item 12 as a second
    // item 11 and the list is still 12 long, while every number in it is
    // already cited — so `uncovered` is empty and the real item 12 has no box
    // that parity would miss if it were deleted.
    const numbers = gateItemNumbers(await readSkill(dir));
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });

  it("maps each numbered item's contract text to its box, in both directions", async () => {
    // Coverage by number is not coverage of meaning: reword item 7 into a
    // different reviewer's gate and `uncovered` stays empty, while every other
    // assertion here reads the checklist rather than `SKILL.md` and so cannot
    // tell that the box now restates a contract nobody wrote. The clause has to
    // be matched on both sides — as `SPEC_LEVEL_PARITY` already does for the
    // conditions that carry no number.
    const items = gateItems(await readSkill(dir));
    const boxes = checklistBoxes(await readChecklist(dir)).map((box) => ({
      text: box.text.replace(/\s+/g, " "),
      cites: citedGateItems(box.text),
    }));
    for (const entry of GATE_ITEM_PARITY) {
      const matched = items.filter((item) => item.text.includes(entry.condition));
      expect(matched, `"${entry.condition}" names exactly one gate item`).toHaveLength(1);
      expect(matched[0]?.number, `"${entry.condition}" is gate item ${entry.item}`).toBe(
        entry.item,
      );
      const covering = boxes.filter(
        (box) => box.cites.has(entry.item) && box.text.includes(entry.box),
      );
      expect(
        covering.length,
        `gate item ${entry.item}: "${entry.box}" is missing from a box citing it`,
      ).toBeGreaterThan(0);
    }
    const unmapped = items
      .filter((item) => !GATE_ITEM_PARITY.some((entry) => entry.item === item.number))
      .map((item) => item.number);
    expect(unmapped, "every numbered gate item has a mapped contract clause").toEqual([]);
  });

  it("pins each numbered item whole, so a clause added to one cannot pass silently", async () => {
    // `GATE_ITEM_PARITY` is satisfied by one matching clause per item number.
    // Append a new reviewer condition to gate item 7's existing sentence and
    // every mapped substring still matches, the number still has an entry and
    // `unmapped` is still empty, so the checklist can stay a clause behind
    // forever. Addressing the item's whole text is what makes that visible.
    const items = gateItems(await readSkill(dir));
    expect(items.map((item) => item.number)).toEqual(
      Object.keys(GATE_ITEM_CONTRACT_DIGESTS)
        .map(Number)
        .sort((a, b) => a - b),
    );
    for (const item of items) {
      const digest = createHash("sha256").update(item.text, "utf8").digest("hex");
      expect(
        digest,
        `gate item ${item.number} changed: re-read it against the box that cites it, extend ` +
          `GATE_ITEM_PARITY and final-checklist.md if it grew a clause, then re-pin the digest`,
      ).toBe(GATE_ITEM_CONTRACT_DIGESTS[item.number]);
    }
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
    expect(checklist).toContain("`product-surface-reviewer` PASS — **prototype parity**");
  });

  it("requires both core reviewer responses in the pack, not only the evidence append", async () => {
    // The append is the row's copy of a verdict. Asking for it alone let a pack
    // that held some third reviewer and neither of these two seal and recompute
    // cleanly at gate item 10, while `--profile tdd` — the run this list ends on
    // — reports no `QFAI-REVIEW-*`, so nothing mechanical saw the gap.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("Both responses are also in the round's review pack");
    expect(checklist).toContain(
      "`R0N_completion-reviewer.md` and `R0N_implementation-reviewer.md`",
    );
    expect(checklist).toContain("each with its own `reviewers[]` entry in `summary.json`");
  });

  it("requires the prototype-parity verdict in the review pack, not only in the entry", async () => {
    // `review-artifact-layout.md` makes gate items 7-9 all pack-bearing, and
    // `--profile tdd` — the run this list ends on — reports no `QFAI-REVIEW-*`
    // finding. A `Prototype parity: PASS` line with no reviewer response
    // behind it therefore passed every mechanical check there is.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("that reviewer's response is in the round's review pack");
    expect(checklist).toContain("`R0N_product-surface-reviewer.md`");
    expect(checklist).toContain("`reviewers[]` entry in `summary.json`");
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

  it("requires the gatekeeper PASS on the falsifiability path too", async () => {
    // Phase Red step 3c routes `qa-gatekeeper` on the mutation run and writes
    // `todo -> red` only on PASS. Asking for the trio alone let the
    // implementer self-report which predicate was broken and why it failed —
    // the one check that separates a falsifiability row from a test that
    // would pass against anything.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain(
      "**and `qa-gatekeeper` returned PASS on that mutation run**, recorded in the entry",
    );
    expect(checklist).toContain("the predicate broken is the one `Satisfied-by` names");
  });

  it("checks the evidence entry's identity copy against the ledger row", async () => {
    // Gate item 10 compares the copy, not just the anchor: a handback or
    // review-fix that renames a `Selector` in the ledger alone leaves the
    // anchor resolving, the pack seal sealing and every `Audited evidence
    // hash` recomputing over the stale entry.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("the entry's identity copy still matches the ledger row");
    expect(checklist).toContain("`TDD-ID`, `Layer`, `Test file`, `Selector`");
    expect(checklist).toContain("`TC-ref` for `Unit` / `Component` / `Integration`");
  });

  it("requires the surviving observations to agree on the row's final revision", async () => {
    // Every other check here is internally consistent by construction: edit
    // production or test code after a PASS and the anchor, identity copy, pack
    // seal and each `Audited evidence hash` still recompute, while the next
    // checkpoint runs green against the new tree. Only the revision comparison
    // sees that the reviewers ruled on code that no longer exists.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**agree on the revision the row finally landed at**");
    expect(checklist).toContain(
      "the `Reviewed revision` of **every** reviewer response the row required",
    );
    expect(checklist).toContain("and the pack's `summary.json.revision`");
    // Item 3 keeps its own field — demanding one revision across all four is
    // what made every correct handed-over and `falsifiability` row stale.
    expect(checklist).toContain(
      "`RED revision` (or `Falsifiability revision` in its place) is the standing exception",
    );
  });

  it("compares the product-surface reviewer's revision too, not just the core two", async () => {
    // Naming "both reviewers" quantified over completion and implementation
    // only, so a UI edited after the parity PASS cleared this box: bring those
    // two and `summary.json.revision` to the final revision, leave the product
    // response at its old one, and the surface that shipped is the one nobody
    // reviewed. The shared reviewer template requires the field on every
    // response, so the third reviewer is the same rule, not a new one.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**plus `product-surface-reviewer` on a UI-affecting row**");
    expect(checklist).toContain("required on every response");
  });

  it("leaves a registered legacy pack outside the revision comparison", async () => {
    // Naming `RED revision` as "the only" exception made the box impossible to tick on
    // an upgraded project: `evidence-revision.md` accepts a malformed or absent
    // `summary.json.revision` on a pack that declares `revision_form: "legacy"`
    // and is listed in `.qfai/review/.legacy-packs`, because the tree that round
    // described cannot be reconstructed and there is no content hash to migrate
    // it to. A `done` row has no legal transition that would produce a fresh
    // pack, so demanding agreement there blocked completion permanently — the
    // same shape as the `Pre-split-evidence: implement` carve-out above.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**registered legacy pack**");
    expect(checklist).toContain('`revision_form: "legacy"`');
    expect(checklist).toContain("`.qfai/review/.legacy-packs`");
    expect(checklist).toContain(
      "**The comparison reaches the rounds written under the current contract**",
    );
    // The exception is corroborated, never self-declared, and unreachable from
    // a row this run advances — otherwise it is a way out of the whole box.
    expect(checklist).toContain("The pack's own word is not enough");
    expect(checklist).toContain(
      "A row this run advances opens a new pack under the current contract",
    );
    // The waiver must not swallow the standing one it sits beside.
    expect(checklist).toContain(
      "`RED revision` (or `Falsifiability revision` in its place) is the standing exception",
    );
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

  it("makes the spec-level checkpoint cover the ledger's current state, not an older one", async () => {
    // A seal addresses the record, never the ledger the record was meant to
    // cover. So a boundary recorded before an approved CR reset and re-ran a row
    // recomputes exactly as cleanly as a current one, and the spec completes on
    // a full-suite result taken against a ledger state it has since left —
    // which is the case `checkpoint-verification.md` sends back for a re-run.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("the state that record names is this ledger's current one");
    expect(checklist).toContain("predates the last ledger change and owes a re-run");
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

  it("makes the shared-artifact exception carry the re-taken proof, not just a new hash", async () => {
    // A hash addresses the current bytes. An assertion helper or snapshot
    // weakened until the row's test cannot fail hashes exactly as cleanly as
    // a sound one, so a re-verify entry holding only spec/`TDD-ID`, manifest
    // and hash clears the mismatch on a row that is now tautological.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("carries the re-verification itself");
    expect(checklist).toContain("the selector re-run under the changed artifact with its result");
    expect(checklist).toContain("re-applied, its failure, the restored GREEN after the revert");
  });

  it("covers every spec-level completion condition and prohibition with a box", async () => {
    // The numbered gate items are covered by `citedGateItems`; the spec-level
    // conditions the same derivation rule claims had no analysis at all, so a
    // new bullet in either section drifted with the checklist still green.
    const skill = await readSkill(dir);
    const boxes = checklistBoxes(await readChecklist(dir)).map((box) =>
      box.text.replace(/\s+/g, " "),
    );
    for (const heading of [SPEC_CONDITIONS_HEADING, PROHIBITIONS_HEADING]) {
      const bullets = sectionBullets(skill, heading);
      expect(bullets.length).toBeGreaterThan(0);
      const expected = SPEC_LEVEL_PARITY.filter((entry) => entry.heading === heading);
      for (const entry of expected) {
        const matched = bullets.filter((bullet) => bullet.includes(entry.condition));
        expect(matched, `${heading}: "${entry.condition}" names exactly one bullet`).toHaveLength(
          1,
        );
        expect(
          boxes.filter((box) => box.includes(entry.box)).length,
          `${heading}: "${entry.condition}" has a checklist box`,
        ).toBeGreaterThan(0);
      }
      const unmapped = bullets.filter(
        (bullet) => !expected.some((entry) => bullet.includes(entry.condition)),
      );
      expect(unmapped, `${heading}: every bullet is covered by a checklist box`).toEqual([]);
    }
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
