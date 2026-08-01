import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched at the
// monorepo root resolves `../..` to the directory ABOVE the repo, and every
// read below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Collapses whitespace runs so a prose reflow is not a failure. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

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
      expect(flat(template)).toContain("exactly one code per cell");
    });

    it(`${tree}: the legend names the definition file and the enforcing rule`, async () => {
      const template = await read(tree, TEMPLATE);
      // Stable anchors: the link, the rule id and the helper name. The prose
      // around them is free to be copy-edited without failing this.
      expect(template).toContain(".qfai/assistant/catalog/test-layers.md");
      expect(template).toContain("TDDLIST_TC_NOT_COVERED");
      expect(template).toContain("isCoverageTargetLevel");
    });

    it(`${tree}: the legend points at test-layers.md rather than redefining the codes`, async () => {
      // Two documents each claiming to define the vocabulary is how they
      // drifted: the template said L1/L2 were defined in it while the quality
      // gate said every code comes from the catalog. The catalog now defines
      // all five, so the template must read as a pointer.
      const template = await read(tree, TEMPLATE);
      expect(template).not.toContain("L1 and L2 are described here");
      expect(flat(template)).toContain(
        "All five codes are defined in `.qfai/assistant/catalog/test-layers.md`",
      );

      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      for (const heading of ["### L1 Unit", "### L2 Component"]) {
        expect(catalog).toContain(heading);
      }

      const gate = await read(tree, "assistant/skills/qfai-sdd/references/sdd-quality-gate.md");
      expect(flat(gate)).toContain(
        "`.qfai/assistant/catalog/test-layers.md#layer-definitions`, which defines all five",
      );
    });

    it(`${tree}: the seeded example rows use a code the legend defines`, async () => {
      const template = await read(tree, TEMPLATE);
      const rows = template.split(/\r?\n/).filter((line) => /^\|\s*TC-\d{4}\s*\|/.test(line));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const level = (row.split("|")[2] ?? "").trim();
        expect(["L1", "L2", "L3", "L4", "L5"]).toContain(level);
      }
    });

    it(`${tree}: both normative required-column lists include Level`, async () => {
      // The column set is the contract; asserting the exact list is the point
      // of this case, so it stays a literal — only wrapping is normalized.
      const columns = "`TC-ID`, `Level`, `EX-Ref`, `AC-Refs`, and `Type`";
      expect(flat(await read(tree, "assistant/skills/qfai-sdd/SKILL.md"))).toContain(columns);
      expect(
        flat(await read(tree, "assistant/skills/qfai-sdd/references/sdd-quality-gate.md")),
      ).toContain(columns);
    });
  }
});
