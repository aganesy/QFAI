import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md";

describe("the Level column is specified where it is used", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the template carries a Level legend beside the Type legend`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("### Level column values");
      expect(template).toContain("### Type column values");
      expect(template.indexOf("### Level column values")).toBeLessThan(
        template.indexOf("### Type column values"),
      );
      for (const code of ["`L1`", "`L2`", "`L3`", "`L4`", "`L5`"]) {
        expect(template).toContain(code);
      }
      expect(template).toContain("exactly one code per cell");
    });

    it(`${tree}: the legend names the definition file and the enforcing rule`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(".qfai/assistant/catalog/test-layers.md");
      expect(template).toContain("TDDLIST_TC_NOT_COVERED");
    });

    it(`${tree}: the seeded example rows use a code the legend defines`, async () => {
      const template = await read(tree, TEMPLATE);
      const rows = template
        .split(/\r?\n/)
        .filter((line) => /^\|\s*TC-\d{4}\s*\|/.test(line));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const level = (row.split("|")[2] ?? "").trim();
        expect(["L1", "L2", "L3", "L4", "L5"]).toContain(level);
      }
    });

    it(`${tree}: both normative required-column lists include Level`, async () => {
      expect(await read(tree, "assistant/skills/qfai-sdd/SKILL.md")).toContain(
        "`TC-ID`, `Level`, `EX-Ref`, `AC-Refs`, and `Type`",
      );
      expect(
        await read(tree, "assistant/skills/qfai-sdd/references/sdd-quality-gate.md"),
      ).toContain("`TC-ID`, `Level`, `EX-Ref`, `AC-Refs`, and `Type`");
    });
  }
});
