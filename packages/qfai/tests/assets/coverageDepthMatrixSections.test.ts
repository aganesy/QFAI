/**
 * Sections 1–6 and 8 map to scored US/TC columns. Section 7 maps to a
 * separate BR table in the same committed artifact. Failure coverage applies
 * to kept failures; an absent failure obligation is represented by n/a.
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
    expect(checklist).toContain("an unconditional `BR-*` has no branches to cover");
    expect(checklist).toContain("templated value of `Conditional branches`");
    expect(checklist).toContain("Mark applicable cells: ✅ covered, ⚠️ partial, ❌ missing");
    // The conditional sections carry `n/a` in the template too, so an analyst
    // with no state machine has a cell to write rather than a gap to invent.
    expect(checklist).toContain("Sections 5 and 6");
    for (const row of ["US-0001", "TC-0001"]) {
      const conditional = headerCells(await read(tree, CHECKLIST), row);
      expect(conditional[7]).toBe("✅/⚠️/❌/n/a");
      expect(conditional[8]).toBe("✅/⚠️/❌/n/a");
    }
    for (const row of ["US-0001", "TC-0001"]) {
      const cells = headerCells(await read(tree, CHECKLIST), row);
      expect(cells[3]).toBe("✅/⚠️/❌/n/a");
      expect(cells[2]).toBe("✅/⚠️/❌");
      expect(cells[4]).toBe("✅/⚠️/❌");
    }
    expect(headerCells(await read(tree, CHECKLIST), "BR-0001")[2]).toBe("✅/⚠️/❌/n/a");
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
      "Every active BR-\\* declared in 04_Business-Rules.md has at least one positive test case.",
    );
    expect(checklist).toContain("Negative business-rule cases tested only for kept failures.");
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
        "verify applicable coverage for: equivalence partitions, normal path, error path, edge cases, boundary values",
      );
      expect(text).toContain(
        "the business rule coverage table under it when the spec declares `BR-*`. Flag any ❌ cells in either as gaps.",
      );
      expect(text).toContain("recorded per BR in the business rule coverage table");
    }
  });

  it("splits mixed inputs and scopes only the failure side before implementation", async () => {
    for (const rel of [
      "assistant/skills/qfai-sdd/SKILL.md",
      "assistant/skills/qfai-sdd/references/sdd-quality-gate.md",
      "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
    ]) {
      const binding = flat(await read(tree, rel));
      expect(binding, rel).toContain("normal path and declared valid boundaries per AC");
      expect(binding, rel).toContain("require failures only for kept failures");
      expect(binding, rel).not.toContain("with normal-path plus error/boundary coverage");
      expect(binding, rel).not.toContain("Error or boundary coverage is present");
      expect(binding, rel).not.toContain("One `error` or `boundary` test case");
    }
    const checklist = flat(await read(tree, CHECKLIST));
    for (const clause of [
      "A failure named by a specification, unless a type or schema excludes it",
      // An observation is never excluded by a schema: the failure happened.
      "A failure actually observed, whatever a type or schema says",
      "A failure declared by an active CON-API or CON-DB owned by the reviewed spec",
      "A failure required by the safety floor in `.agents/rules/minimal-implementation.md` § 2",
      "whether or not handling code exists yet",
      "Valid special-value partitions (null, empty, zero, default)",
      "Invalid special-value partitions (null, empty, zero, default) tested only for kept failures",
      "Valid edge cases identified and tested (concurrent access, timing, empty collections, maximum payload)",
      "Failure edge cases tested only for kept failures (concurrent access, timing, empty collections, payload limits)",
      "Null / undefined / missing values tested where valid",
      "Empty strings, empty arrays, empty objects tested where valid",
      "Maximum-length strings and maximum-size payloads tested where valid",
      "Special characters tested where valid",
      "Invalid state transitions tested and rejected only for kept failures",
      "Conflicting or contradictory input combinations tested only for kept failures",
      "Oracle strength is not waivable by category coverage",
    ]) {
      expect(checklist.includes(clause), clause).toBe(true);
    }
    for (const clause of [
      "A test case exists for each kept failure — every one, not one of them",
      "Just below minimum (invalid) tested only for kept failures",
      "Just above maximum (invalid) tested only for kept failures",
      "Invalid partitions identified with at least one representative test case each, only for kept failures",
      "Conditional business rules have test cases for each branch",
    ]) {
      expect(checklist.includes(clause), clause).toBe(true);
    }
    const gatekeeper = flat(await read(tree, "assistant/agents/qa-gatekeeper.md"));
    expect(
      gatekeeper.includes("Failure-side coverage follows the checklist's kept-failure scope"),
    ).toBe(true);
    expect(gatekeeper).not.toContain("normal path AND error/failure path");
    const analyst = flat(await read(tree, ANALYST));
    expect(
      analyst.includes("Failure-side coverage follows the checklist's kept-failure scope"),
    ).toBe(true);
    expect(analyst).not.toContain("Test cases covering only normal (happy) paths are INCOMPLETE");
    expect(analyst).toContain("require error/boundary failures only for kept failures");
    expect(analyst).toContain(
      "at least one positive test case and negative cases only for kept failures",
    );
    expect(analyst).not.toContain("at least one positive and one negative test case");
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "normal-path-only coverage is incomplete where an applicable obligation is uncovered",
    );
    expect(skill).toContain("normal path, declared valid boundaries and kept failures");
    expect(skill).not.toContain(
      "normal-path-only coverage is incomplete only where a kept failure is uncovered",
    );
  });

  it("maps every kept contract failure to an existing scored row and failure assertion", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("Map every kept CON-API or CON-DB failure to a covering US/TC row");
    expect(checklist).toContain("name the contract ID and failure clause");
    expect(checklist).toContain("API or Integration assertion and evidence");
    expect(checklist).toContain("Happy-path annotations alone do not cover the failure");
    expect(checklist).toContain("If no existing US/TC row owns it, record DRIFT");
    expect(checklist).toContain("before a clean coverage verdict");
    expect(checklist).toContain(
      "Contract-derived failures are scored only for active, owned whole contracts",
    );
    expect(checklist).toContain(
      "a planned contract contributes no contract-derived failure obligation in this slice",
    );
    expect(checklist).toContain("never an API operation");
    expect(checklist).toContain("standalone SQL comment");
  });

  it("carries governing specs, referenced contracts and relevant types into production and review", async () => {
    for (const card of [ANALYST, "assistant/agents/qa-gatekeeper.md"]) {
      const raw = await read(tree, card);
      const inputs = flat(raw.split("## Inputs you must read")[1]?.split("\n## ")[0] ?? "");
      expect(inputs).toContain("types and schemas governing the reviewed values");
      expect(inputs).toContain("CON-API");
      expect(inputs).toContain("CON-DB");
      expect(inputs).toContain("04_Business-Rules.md");
      expect(inputs).toContain("06_Test-Cases.md");
      expect(inputs).toContain("QFAI-CONTRACT-REF");
      expect(inputs).toContain("conditional");
      expect(inputs).toContain("all existing `01..10` and `16_*` Markdown files");
      expect(inputs).toContain("Before reporting no referenced contract");
      expect(inputs).toContain("paths.specsDir");
      expect(inputs).toContain("same full scan for shared ownership");
    }
    expect(flat(await read(tree, ANALYST))).not.toContain(
      "in `qfai-implement`'s `plan` phase, and there only",
    );
    expect(flat(await read(tree, SKILL))).toContain(
      "referenced contracts and relevant types/schemas for kept-failure judgments",
    );
    const analyst = flat(await read(tree, ANALYST));
    expect(analyst).not.toContain("`US-*` seeds no ledger row");
    expect(analyst).toContain("active `US-*` has an E2E row carrying `US-Refs`");
  });

  it("excludes failures only after validation and routes declared conflicts upstream", async () => {
    const checklist = flat(await read(tree, CHECKLIST));
    expect(checklist).toContain("only after the value has passed that type or schema's validation");
    expect(checklist).toContain("Untrusted input still requires boundary validation and rejection");
    expect(checklist).toContain(
      "If a specification or contract names a failure that conflicts with a type or schema",
    );
    expect(checklist).toContain("record DRIFT and route it to the upstream owner");
    expect(checklist).toContain(
      "Do not erase the declared obligation or mark it n/a while that conflict is unresolved",
    );
    expect(checklist).toContain(
      "Explicit specification failures and actual observations remain kept even when a contract is deferred",
    );
  });
});
