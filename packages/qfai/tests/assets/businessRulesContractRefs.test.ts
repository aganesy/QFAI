import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: Vitest may be launched from
// the workspace root, from `packages/qfai`, or by an IDE with its own CWD, and
// the reads below must resolve the same way in all three.
// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/04_Business-Rules.md";
const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

/**
 * Splits a markdown table row into trimmed cells.
 *
 * Strips the delimiter pipes by pattern rather than by `slice(1, -1)`, so a row
 * written with a doubled edge pipe (`|| a | b |`) still yields `["a", "b"]`
 * instead of a phantom leading empty cell that would fail the header-order
 * assertion for a reason having nothing to do with the columns.
 */
function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|+/, "")
    .replace(/\|+$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** The first data row of a Rule Table — the first whose BR-ID cell is a BR id. */
function firstRuleRow(rows: readonly string[]): string {
  const row = rows.find((candidate) => /^BR-\d{4}$/.test(cells(candidate)[0] ?? ""));
  if (row === undefined) {
    throw new Error("the Rule Table has no BR-NNNN data row");
  }
  return row;
}

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which prettier happened to break the line.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("04_Business-Rules.md gives contract references a typed column", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Rule Table declares Contract-Refs`, async () => {
      const content = await readFile(path.join(repoRoot, tree, TEMPLATE), "utf-8");
      const rows = content.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
      expect(rows.length).toBeGreaterThanOrEqual(3);

      const header = cells(rows[0]);
      expect(header).toEqual([
        "BR-ID",
        "Title",
        "AC-Refs",
        "Rule",
        "Contract-Refs",
        "Notes",
        "NFR-Refs",
      ]);

      // The sample row must demonstrate the column, not leave a bare
      // placeholder, and only with a kind the toolchain actually recognises.
      // Selected by its BR-ID rather than by position: `rows[2]` assumed
      // exactly one header and one separator row above the sample, so an added
      // alignment row or a second example would have moved it silently.
      expect(cells(firstRuleRow(rows))[header.indexOf("Contract-Refs")]).toMatch(
        /^CON-(?:API|DB|UI)-\d{4}$/,
      );
    });

    it(`${tree}: only offers the contract kinds the toolchain recognises`, async () => {
      const content = unwrap(await readFile(path.join(repoRoot, tree, TEMPLATE), "utf-8"));
      // `specPackIds.ts` and `contractReferences.ts` both match
      // `CON-(API|DB|UI)-N` only, so any other kind an author copies from this
      // template is silently untracked.
      expect(content).toContain("`CON-API-*`, `CON-DB-*` and `CON-UI-*`");
      expect(content).toContain("`CON-API-0001`, `CON-DB-0002`, `CON-UI-0003`");
      const exampleIds = content.match(/\bCON-[A-Z]+-\d{4}\b/g) ?? [];
      expect(exampleIds.length).toBeGreaterThan(0);
      for (const id of exampleIds) {
        expect(id).toMatch(/^CON-(?:API|DB|UI)-\d{4}$/);
      }
    });

    it(`${tree}: the template states the delimiter convention and demotes Notes`, async () => {
      const content = unwrap(await readFile(path.join(repoRoot, tree, TEMPLATE), "utf-8"));
      expect(content).toContain("## Reference Column Conventions");
      expect(content).toContain("comma-separated list of IDs");
      expect(content).toContain("Do not put contract IDs in `Notes`.");
      expect(content).toContain("**not** traced by any tool");
    });

    it(`${tree}: spec-traceability-rules.md documents the BR -> contract edge`, async () => {
      const content = await readFile(path.join(repoRoot, tree, RULES), "utf-8");
      expect(content).toContain("`Contract-Refs` in `04_Business-Rules.md`");
    });
  }
});
