/**
 * The checklist has eight sections and the matrix scored six of them.
 *
 * `test-case-depth-checklist.md` is binding on reviewers, but the completion
 * gate is stated over matrix cells: `/qfai-atdd`'s reviewer gate and its
 * not-done criterion both read "no unjustified ❌ cells". Equivalence
 * partitioning (§1) and business rule coverage (§7) had no column, so neither
 * could ever be ❌, neither could ever need a justification, and a spec with no
 * partition analysis and no `BR-*` positive/negative pairing scored a clean
 * matrix.
 *
 * §7 additionally cannot be a column: it is keyed per `BR-*`, and one rule
 * spans several `TC`s. It gets its own table in the same committed file.
 *
 * These tests pin the scored set against the section set, so a section added
 * later without a cell fails here rather than passing silently forever.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CHECKLIST = "assistant/skills/qfai-atdd/references/test-case-depth-checklist.md";
const SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const ANALYST = "assistant/agents/test-design-analyst.md";
const CATALOG = "assistant/manifest/agent-catalog.yml";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Cells of the first table row that starts with `| <firstCell> |`. */
const headerCells = (raw: string, firstCell: string): string[] => {
  // Padding inside the cells is prettier's business, so match on the trimmed
  // first cell rather than on the exact column widths.
  const row = raw
    .split(/\r?\n/)
    .find((line) => line.startsWith("|") && line.split("|")[1]?.trim() === firstCell);
  if (row === undefined) {
    throw new Error(`no table header starting with "| ${firstCell} |"`);
  }
  return row
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
};

describe.each(TREES)("%s", (tree) => {
  it("has a scored cell for every numbered checklist section", async () => {
    const raw = await read(tree, CHECKLIST);
    const sections = [...raw.matchAll(/^## (\d+)\. /gm)].map((m) => m[1]);
    expect(sections).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);

    // §1..§6 and §8 are matrix columns; §3's three bullets are three of them.
    const columns = headerCells(raw, "US/TC ID");
    expect(columns).toEqual([
      "US/TC ID",
      "Equivalence partitions",
      "Normal path",
      "Error path",
      "Edge cases",
      "Boundary values",
      "Special values",
      "State transitions",
      "Combinatorial",
      "Oracle strength",
      "Status",
    ]);

    // §7 is keyed per BR-*, so it is a table of its own rather than a column.
    expect(headerCells(raw, "BR ID")).toEqual([
      "BR ID",
      "Positive case",
      "Negative case",
      "Conditional branches",
      "Covering TC",
      "Status",
    ]);
  });

  it("points §1 and §7 at the cell that scores them", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("Scored as the `Equivalence partitions` cell of the matrix below.");
    expect(checklist).toContain(
      "Scored in the **Business rule coverage** table below the matrix, one row per `BR-*`.",
    );
    expect(checklist).toContain("**Every section above is scored.**");
  });

  it("counts the category cells the matrix actually has", async () => {
    // The arithmetic used to say six, which was the count the columns allowed
    // rather than the count the sections required.
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("A row whose eight category cells are ✅");
    expect(checklist).not.toContain("A row whose six category cells are ✅");
  });

  it("puts the business rule table inside the same ❌ accounting", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("an unjustified ❌ here is the same REVISE");
    expect(checklist).toContain(
      "**REVISE**: Any scored cell in either table is ❌ without an explicit justification",
    );
  });

  it("scores marks only, so a templated BR row can pass", async () => {
    // `BR ID` and `Covering TC` hold references, so a gate stated over "all
    // cells" could never be satisfied by a business rule row filled in as the
    // template prescribes.
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("**Only the mark cells are scored.**");
    expect(checklist).toContain("**PASS**: All scored cells in both tables are ✅, ⚠️");
    expect(checklist).not.toContain("**PASS**: All cells in both tables are ✅");
  });

  it("lets the templated `n/a` branch cell pass", async () => {
    // `Conditional branches` is scored and its template offers `n/a`, so a PASS
    // stated as "✅ or ⚠️" alone locked out every unconditional BR-*.
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("for partial coverage, or `n/a`.");
    expect(checklist).toContain(
      "an unconditional `BR-*` has no branches to cover — and is the templated value of `Conditional branches`",
    );
  });

  it("scopes the business rule table to active declarations", async () => {
    // A spec whose `04_Business-Rules.md` keeps a retired rule as prose history
    // must not owe positive/negative cases for it.
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("One row per **active** `BR-*` of `04_Business-Rules.md`");
    expect(checklist).toContain(
      "or its own heading **without a `Status:` retiring it** (`superseded`, `retired`, `removed`, `deprecated`)",
    );
    expect(checklist).toContain("Neither form is an obligation, so neither gets a row");
    expect(checklist).not.toContain("One row per `BR-*` referenced in `04_Business-Rules.md`");
    expect(checklist).toContain(
      "Every active BR-\\* declared in 04_Business-Rules.md has at least one positive and one negative test case.",
    );
  });

  it("asks the gatekeeper for the table only where BR-* are declared", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain(
      "Require the business rule table **only when the spec declares an active `BR-*`**",
    );
    expect(checklist).toContain(
      "read the spec's `04_Business-Rules.md` and reconcile: every active `BR-ID` owns a row",
    );
  });

  it("gives the reviewer gate the BR source to reconcile against", async () => {
    // Without `04_Business-Rules.md` as a reviewer input, a table listing only
    // the rules the analyst remembered is all ✅ and passes.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "reconciled against the spec's `04_Business-Rules.md`, which the reviewer work order MUST carry as an input",
    );
    expect(skill).toContain(
      "that table drops an active `BR-ID` declared in `04_Business-Rules.md`",
    );
    // A heading-only `04_Business-Rules.md` (no Rule Table) must still be
    // reconciled, or dropping every heading-form rule reads as a clean table.
    expect(skill).toContain(
      "whether the declaration is a Rule Table row or a `BR-*` heading carrying no retiring `Status:`",
    );
  });

  it("makes both gate statements read both tables, in one marker", async () => {
    // The reviewer-gate bullet was the only place spelling the marker `X`,
    // so a reviewer matching on it found nothing to check.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "Coverage Depth Matrix and its business rule coverage table are reviewed and no unjustified `❌` cells remain in either;",
    );
    expect(skill).not.toContain("unjustified `X` cells");
    expect(skill).toContain(
      "Coverage Depth Matrix is missing, omits the business rule coverage table on a spec that declares an active `BR-*`, or contains unjustified ❌ cells in either table",
    );
  });

  it("tells the analyst to fill the categories the form now carries", async () => {
    for (const rel of [ANALYST, CATALOG]) {
      const text = flat(await read(tree, rel));
      expect(text).toContain(
        "verify that test cases exist for: equivalence partitions, normal path, error path, edge cases, boundary values",
      );
      expect(text).toContain(
        "the business rule coverage table under it when the spec declares `BR-*`. Flag any ❌ cells in either as gaps.",
      );
      expect(text).toContain("recorded per BR in the business rule coverage table");
    }
  });
});
