import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Splits a markdown table row into trimmed cells. */
const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

function crosswalkRows(content: string): string[][] {
  const start = content.indexOf("## Layer vocabulary crosswalk (normative)");
  const section = content.slice(start, content.indexOf("## Layer definitions"));
  return section
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .map(cells);
}

describe("the layer vocabulary has one crosswalk", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: all five layers appear with code, word, tag and directory`, async () => {
      const rows = crosswalkRows(await read(tree, "assistant/catalog/test-layers.md"));
      // header + separator + 5 layers
      expect(rows).toHaveLength(7);
      expect(rows[0]?.slice(0, 4)).toEqual(["Code", "Word", "Tag", "Test directory"]);
      expect(rows.slice(2).map((row) => row[0])).toEqual(["L1", "L2", "L3", "L4", "L5"]);
      expect(rows.slice(2).map((row) => row[1])).toEqual([
        "Unit",
        "Component",
        "Integration",
        "API",
        "E2E",
      ]);
    });

    it(`${tree}: the tag column matches the code's LAYER_TAGS set exactly`, async () => {
      const rows = crosswalkRows(await read(tree, "assistant/catalog/test-layers.md"));
      const tags = rows.slice(2).map((row) => (row[2] ?? "").replace(/`/g, ""));
      expect(new Set(tags)).toEqual(LAYER_TAGS);
    });

    it(`${tree}: one value per cell is stated`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("**One value per cell.**");
      expect(catalog).toContain("is two rows, not one row with\n  two values");
    });

    it(`${tree}: the TC template states the Level vocabulary where authors type`, async () => {
      const template = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      expect(template).toContain("## Level vocabulary");
      expect(template).toContain("holds exactly **one** layer code");
      expect(template).toContain("`L1` and `L2` are TDD coverage targets");
    });
  }
});
