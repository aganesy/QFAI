/**
 * Phase 2b's `tdd/test-list.md` is on the two completion surfaces (#582).
 *
 * `/qfai-sdd` has a phase whose entire purpose is one file, yet neither of the
 * lists a finished run is checked against named it: `## Mandatory Outputs` in
 * `SKILL.md` (whose numbered `01..10` range cannot reach a `tdd/`
 * subdirectory — which is why `16_Traceability-ledger.md` needed its own
 * bullet) and
 * `references/sdd-quality-gate.md`, "the full quality gate checklist behind
 * `/qfai-sdd`", which contained the string `test-list` zero times. A run that
 * skipped Phase 2b therefore exited clean by every measure the skill defines
 * for itself; the first thing to notice was `/qfai-implement`, by having zero
 * selectable items, and then `TDDLIST_TC_NOT_COVERED` as an unwaivable error.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SDD = "assistant/skills/qfai-sdd";
const SKILL = `${SDD}/SKILL.md`;
const GATE = `${SDD}/references/sdd-quality-gate.md`;
const CHECKLISTS = `${SDD}/references/sdd-phase-checklists.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The `## Mandatory Outputs` section body, up to the next heading. */
function mandatoryOutputs(skill: string): string {
  const start = skill.indexOf("## Mandatory Outputs");
  expect(start).toBeGreaterThan(-1);
  const rest = skill.slice(start + "## Mandatory Outputs".length);
  const end = rest.indexOf("\n## ");
  return flat(end === -1 ? rest : rest.slice(0, end));
}

/** The `## Structural Checks` section body, up to the next heading. */
function structuralChecks(gate: string): string {
  const start = gate.indexOf("## Structural Checks");
  expect(start).toBeGreaterThan(-1);
  const rest = gate.slice(start + "## Structural Checks".length);
  const end = rest.indexOf("\n## ");
  return flat(end === -1 ? rest : rest.slice(0, end));
}

describe("Phase 2b's tdd/test-list.md is on the completion surfaces", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Mandatory Outputs names the ledger`, async () => {
      // The numbered `01..10` range cannot reach a `tdd/` subdirectory, so the
      // ledger needs its own bullet exactly as `16_Traceability-ledger.md` does.
      const outputs = mandatoryOutputs(await read(tree, SKILL));

      expect(outputs).toContain("`spec-*/tdd/test-list.md`");
      expect(outputs).toContain("seeded at Phase 2b");
    });

    it(`${tree}: Mandatory Outputs states when an empty table is allowed`, async () => {
      const outputs = mandatoryOutputs(await read(tree, SKILL));

      // Without the qualifier a reviewer cannot tell a legitimately empty
      // ledger from a skipped phase — both are a file with no rows.
      expect(outputs).toContain("empty table only when the spec declares no coverage-target TC");

      // No new rule: the checklist page already says the same thing.
      const checklists = flat(await read(tree, CHECKLISTS));
      expect(checklists).toContain(
        "An empty table is a valid outcome when the spec declares no coverage-target TC.",
      );
    });

    it(`${tree}: the quality gate's Structural Checks ask for the ledger`, async () => {
      const gate = await read(tree, GATE);

      // The completion checklist contained "test-list" zero times.
      expect(gate).toContain("tdd/test-list.md");

      const checks = structuralChecks(gate);
      expect(checks).toContain(
        "Each target spec has `tdd/test-list.md` with one row per coverage-target TC from `06_Test-Cases.md`",
      );
      // Matches `sdd-phase-checklists.md`'s "Keep the ledger table the first
      // markdown table in the file."
      expect(checks).toContain("the ledger is the first Markdown table in the file");
    });
  }
});
