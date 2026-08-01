import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  NON_COVERAGE_LAYERS,
  UNIT_COMPONENT_LAYERS,
  isCoverageTargetLevel,
} from "../../src/core/tddHelpers.js";
import { LAYER_TAGS } from "../../src/core/testStrategyTags.js";

// Anchored to this file, not to `process.cwd()`: vitest runs this suite from
// `packages/qfai`, but a runner launched at the monorepo root would resolve
// `../..` to the directory ABOVE the repo and every read below would fail on a
// path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Splits a markdown table row into trimmed cells. */
const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

const CROSSWALK_HEADING = "## Layer vocabulary crosswalk (normative)";
const NEXT_HEADING = "## Layer definitions";

function crosswalkRows(content: string): string[][] {
  // Both markers are asserted before slicing: an `indexOf` miss returns -1, and
  // `slice(-1, …)` / `slice(…, -1)` would then silently yield a different
  // region — a renamed heading would surface as a confusing row count instead
  // of naming the section that moved.
  const start = content.indexOf(CROSSWALK_HEADING);
  const end = content.indexOf(NEXT_HEADING);
  expect(start, `heading not found: ${CROSSWALK_HEADING}`).toBeGreaterThan(-1);
  expect(end, `heading not found or out of order: ${NEXT_HEADING}`).toBeGreaterThan(start);
  const section = content.slice(start, end);
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

    it(`${tree}: the TC table stays the first markdown table in the template`, async () => {
      const template = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      // `collectTestCaseIds` / `collectTddCoverage` read parseFirstMarkdownTable
      // and bail without a `TC-ID` column, which would disable
      // TDDLIST_TC_NOT_COVERED for the whole spec.
      const firstTableHeader = template.split(/\r?\n/).find((line) => line.trim().startsWith("|"));
      expect(firstTableHeader).toContain("TC-ID");
      expect(template).toContain("Deliberately a list, not a table");
    });

    it(`${tree}: the directory column defers to the configured testsDir`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      const directories = crosswalkRows(catalog)
        .slice(2)
        .map((row) => row[3] ?? "");
      expect(directories.slice(2)).toEqual([
        "`<testsDir>/integration/**`",
        "`<testsDir>/api/**`",
        "`<testsDir>/e2e/**`",
      ]);
      expect(catalog).toContain("**`<testsDir>` is `paths.testsDir` from `qfai.config.yaml`**");
      expect(catalog).toContain("whose default\n  is `tests`");
    });

    it(`${tree}: a TC row's Level is restricted to the layers the gate can route`, async () => {
      const catalog = await read(tree, "assistant/catalog/test-layers.md");
      expect(catalog).toContain("**A `TC-*` row's `Level` is L1-L3.**");
      // L4 / L5 carry no `06_Test-Cases.md#Level` spelling.
      const levelCells = crosswalkRows(catalog)
        .slice(2)
        .map((row) => row[4] ?? "");
      expect(levelCells).toEqual(["`L1`", "`L2`", "`L3`", "—", "—"]);

      const template = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      expect(template).toContain("**`L4` and `L5` are not `TC-*` values.**");
    });

    it(`${tree}: the TC template spells the gate's directories with <testsDir>`, async () => {
      const template = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      // `evaluateAtddCodeTraceability` roots its scan at `paths.testsDir`, so a
      // project that repoints it would not match a literal `tests/` prefix.
      for (const dir of ["integration", "api", "e2e"]) {
        expect(template).toContain(`\`<testsDir>/${dir}/**\``);
      }
      expect(template).not.toMatch(/`tests\/(integration|api|e2e)\/\*\*`/);
      expect(template).toContain("`<testsDir>` is `paths.testsDir` from `qfai.config.yaml`");
    });
  }

  it("the code-side layer sets carry both spellings of every crosswalk row", () => {
    for (const spelling of ["unit", "l1", "component", "l2"]) {
      expect(UNIT_COMPONENT_LAYERS.has(spelling)).toBe(true);
      expect(isCoverageTargetLevel(spelling)).toBe(true);
    }
    for (const spelling of ["integration", "l3", "api", "l4", "e2e", "l5"]) {
      expect(NON_COVERAGE_LAYERS.has(spelling)).toBe(true);
      expect(isCoverageTargetLevel(spelling)).toBe(false);
    }
  });
});
