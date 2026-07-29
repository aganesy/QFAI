import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/04_Business-Rules.md";
const RULES = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

/** Splits a markdown table row into trimmed cells. */
function cells(row: string): string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
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
      expect(cells(rows[2])[header.indexOf("Contract-Refs")]).toMatch(/^CON-(?:API|DB|UI)-\d{4}$/);
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
