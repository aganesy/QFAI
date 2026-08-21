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

/** Every gate item number a checklist box claims to cover. */
function citedGateItems(checklist: string): Set<number> {
  const cited = new Set<number>();
  for (const match of checklist.matchAll(/gate items?\s+([\d,\s]*\d)/g)) {
    for (const part of (match[1] ?? "").split(",")) {
      const value = Number(part.trim());
      if (Number.isInteger(value)) {
        cited.add(value);
      }
    }
  }
  return cited;
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
  });

  it("states the derivation rule that keeps the two in sync", async () => {
    // Without it the next gate item drifts the same way.
    const checklist = await readChecklistProse(dir);
    expect(checklist).toContain("**Derivation rule (MUST).**");
    expect(checklist).toContain("SKILL.md#item-completion-checklist-12-point-gate");
    expect(checklist).toContain("SKILL.md#spec-completion-conditions");
    expect(checklist).toContain("is a defect in");
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
