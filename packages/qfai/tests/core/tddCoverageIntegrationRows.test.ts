/**
 * `qfai report` was silent about the ATDD-owned `Layer = Integration` rows.
 *
 * Every count in the TDD Coverage section is scored against
 * `unitComponentTcIds`, and an `L3` TC is not a coverage target — so a spec
 * whose obligations are all integration-level printed `coverage-target TCs: 0`
 * and `open: 0` while `/qfai-sdd` Phase 2b had seeded it `todo`
 * `Layer = Integration` rows, which prohibit completion. The same ownership
 * reached by a blank or misspelled `Level` *was* counted, so the ledger's
 * progress figure moved with the spelling of a cell rather than with the work.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createReportData, formatReportMarkdown } from "../../src/core/report.js";
import { collectTddCoverage } from "../../src/core/reportTddCoverage.js";
import { collectSpecEntries } from "../../src/core/specLayout.js";

/** A spec whose only declared TC is integration-level, so no coverage target. */
const L3_ONLY_TC_TABLE = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID        | Level | AC-Refs      | EX-Ref       | Title   |",
  "| ------------ | ----- | ------------ | ------------ | ------- |",
  "| TC-0001-0001 | L3    | AC-0001-0001 | EX-0001-0001 | title-1 |",
  "",
].join("\n");

const UNIT_TC_TABLE = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID        | Level | AC-Refs      | EX-Ref       | Title   |",
  "| ------------ | ----- | ------------ | ------------ | ------- |",
  "| TC-0001-0001 | unit  | AC-0001-0001 | EX-0001-0001 | title-1 |",
  "",
].join("\n");

/** A `Level` the TDD vocabulary recognises but the ATDD map does not name. */
function tcTableAtLevel(level: string): string {
  return [
    "# 06 Test Cases",
    "",
    "## Test Case Table",
    "",
    "| TC-ID        | Level | AC-Refs      | EX-Ref       | Title   |",
    "| ------------ | ----- | ------------ | ------------ | ------- |",
    `| TC-0001-0001 | ${level} | AC-0001-0001 | EX-0001-0001 | title-1 |`,
    "",
  ].join("\n");
}

function ledger(rows: Array<{ id: string; tcRefs: string; layer: string; status: string }>) {
  return [
    "# TDD Test List",
    "",
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
    ...rows.map(
      (row) =>
        `| ${row.id} | ${row.tcRefs} | ${row.layer} | tests/x.test.ts | sel-${row.id} | ${row.status} | - | ev |`,
    ),
    "",
  ].join("\n");
}

async function withSpec<T>(
  fn: (root: string) => Promise<T>,
  opts: { tdd?: string; testCases: string },
): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-int-rows-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# 03 AC\n", "utf-8");
    await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), opts.testCases, "utf-8");
    if (opts.tdd !== undefined) {
      await writeFile(path.join(specDir, "tdd", "test-list.md"), opts.tdd, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function coverageFor(opts: { tdd?: string; testCases: string }) {
  return withSpec(async (root) => {
    const entries = await collectSpecEntries(path.join(root, ".qfai", "specs"));
    const coverage = await collectTddCoverage(entries);
    const spec = coverage.specs.find((entry) => entry.specNumber === "0001");
    if (!spec) throw new Error("spec-0001 missing from coverage");
    return spec;
  }, opts);
}

describe("qfai report counts the ATDD-owned Integration rows", () => {
  it("reports the unfinished Integration rows of an L3-only spec", async () => {
    const spec = await coverageFor({
      testCases: L3_ONLY_TC_TABLE,
      tdd: ledger([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Integration", status: "todo" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", layer: "Integration", status: "done" },
      ]),
    });

    // The coverage-target arithmetic is unchanged and still says nothing: an
    // `L3` TC owes no ledger row under `TDDLIST_TC_NOT_COVERED`.
    expect(spec.unitComponentTotal).toBe(0);
    expect(spec.openCount).toBe(0);
    // The rows themselves are now reported, so `open: 0` is no longer the whole
    // story for a spec that cannot be completed.
    expect(spec.integrationRowTotal).toBe(2);
    expect(spec.integrationRowOpenCount).toBe(1);
  });

  it("counts a green Integration row as unfinished, not as done", async () => {
    // `green` / `refactor` / `review-fix` have a passing test and have not
    // cleared their blocking reviewers, and the completion conditions refuse a
    // ledger holding one. Folding them in with `done` would print the spec as
    // finished on exactly the rows that stop it.
    const spec = await coverageFor({
      testCases: L3_ONLY_TC_TABLE,
      tdd: ledger([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Integration", status: "green" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", layer: "Integration", status: "exception" },
      ]),
    });

    expect(spec.integrationRowTotal).toBe(2);
    expect(spec.integrationRowOpenCount).toBe(1);
  });

  it("leaves the coverage-target counts of a unit-only spec untouched", async () => {
    // Over-correction pin: the Integration tally is reported apart from the
    // coverage arithmetic, never mixed into it. A unit ledger keeps the exact
    // counts it had, and its Integration figures are a truthful zero rather
    // than an omission.
    const spec = await coverageFor({
      testCases: UNIT_TC_TABLE,
      tdd: ledger([{ id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Unit", status: "todo" }]),
    });

    expect(spec.unitComponentTotal).toBe(1);
    expect(spec.doneCount).toBe(0);
    expect(spec.openCount).toBe(1);
    expect(spec.integrationRowTotal).toBe(0);
    expect(spec.integrationRowOpenCount).toBe(0);
  });

  it("prints the Integration line only for a spec that has such a row", async () => {
    const withRow = await withSpec(
      async (root) => formatReportMarkdown(await createReportData(root)),
      {
        testCases: L3_ONLY_TC_TABLE,
        tdd: ledger([
          { id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Integration", status: "todo" },
        ]),
      },
    );
    expect(withRow).toContain("- Integration rows (ATDD-owned): 1 (unfinished: 1)");

    const withoutRow = await withSpec(
      async (root) => formatReportMarkdown(await createReportData(root)),
      {
        testCases: UNIT_TC_TABLE,
        tdd: ledger([{ id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Unit", status: "todo" }]),
      },
    );
    expect(withoutRow).not.toContain("Integration rows (ATDD-owned)");
  });
});

describe("qfai report names the integration obligation, not only the rows that were seeded", () => {
  it("reports an L3 TC that no Integration row covers", async () => {
    // Phase 2b never ran, or ran before this TC existed. Row counts describe
    // what was seeded, so on their own they said `0 / 0` — and an `L3` TC is
    // not a coverage target, so the arithmetic above said `0` too. The spec
    // read as finished with no integration test in the tree at all, and no
    // validator reports the missing row either.
    const spec = await coverageFor({
      testCases: L3_ONLY_TC_TABLE,
      tdd: ledger([]),
    });

    expect(spec.unitComponentTotal).toBe(0);
    expect(spec.openCount).toBe(0);
    expect(spec.integrationRowTotal).toBe(0);
    expect(spec.integrationTcExpected).toBe(1);
    expect(spec.integrationTcsWithoutRow).toEqual(["TC-0001-0001"]);
  });

  it("reports a missing row for a spec with no ledger file at all", async () => {
    const spec = await coverageFor({ testCases: L3_ONLY_TC_TABLE });

    expect(spec.integrationTcExpected).toBe(1);
    expect(spec.integrationTcsWithoutRow).toEqual(["TC-0001-0001"]);
  });

  it("counts a TC that a seeded Integration row already names as covered", async () => {
    // Over-correction pin: the obligation is discharged by any `Integration`
    // row carrying the TC, whatever its status and however many boundaries the
    // TC was split across — the split is a floor, so a row count above one is
    // the normal shape rather than a duplicate.
    const spec = await coverageFor({
      testCases: L3_ONLY_TC_TABLE,
      tdd: ledger([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", layer: "Integration", status: "todo" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", layer: "Integration", status: "done" },
      ]),
    });

    expect(spec.integrationTcExpected).toBe(1);
    expect(spec.integrationTcsWithoutRow).toEqual([]);
  });

  for (const level of ["system", "acceptance"]) {
    it(`routes a Level = ${level} TC to the integration obligation, not to neither group`, async () => {
      // These two are the gap the "blank or unrecognised" rule left open. Both
      // are IN the TDD level vocabulary, so they are not unrecognised and not
      // coverage targets — while `resolveAtddHomeKind` routes both to
      // `tests/integration/**` and `/qfai-atdd` writes their tests. Read by
      // spelling they belonged to no group at all; read by routing they belong
      // here, which is what the producer rule now says.
      const spec = await coverageFor({ testCases: tcTableAtLevel(level), tdd: ledger([]) });

      expect(spec.unitComponentTotal).toBe(0);
      expect(spec.integrationTcExpected).toBe(1);
      expect(spec.integrationTcsWithoutRow).toEqual(["TC-0001-0001"]);
    });
  }

  it("keeps an L4 TC out of the integration obligation", async () => {
    // Over-correction pin at the other edge: `L4` routes to `tests/api/**`, so
    // it is not an `Integration` row this phase seeds, and reporting it as one
    // would demand a row the producer rule does not create.
    const spec = await coverageFor({ testCases: tcTableAtLevel("L4"), tdd: ledger([]) });

    expect(spec.integrationTcExpected).toBe(0);
    expect(spec.integrationTcsWithoutRow).toEqual([]);
  });

  it("keeps a unit TC out of the integration obligation", async () => {
    const spec = await coverageFor({ testCases: UNIT_TC_TABLE, tdd: ledger([]) });

    expect(spec.unitComponentTotal).toBe(1);
    expect(spec.integrationTcExpected).toBe(0);
    expect(spec.integrationTcsWithoutRow).toEqual([]);
  });

  it("renders 0 rather than undefined when the counts are absent from the spec", async () => {
    // Both counts are optional on `ReportTddCoverageSpec` — deliberately, so
    // `--format json` omits them rather than publishing a zero — while the
    // line is printed whenever the spec merely OWES rows. A spec carrying
    // `integrationTcsWithoutRow` with the counts unset therefore reached the
    // template, and it rendered
    // `Integration rows (ATDD-owned): undefined (unfinished: undefined)`.
    //
    // `collectTddCoverage` always sets them, which is why every end-to-end row
    // in this file passes; this one produces a real report and then drops the
    // two fields, which is the shape the type permits.
    const rendered = await withSpec(
      async (root) => {
        const data = await createReportData(root);
        for (const spec of data.tddCoverage?.specs ?? []) {
          delete spec.integrationRowTotal;
          delete spec.integrationRowOpenCount;
        }
        return formatReportMarkdown(data);
      },
      { testCases: L3_ONLY_TC_TABLE, tdd: ledger([]) },
    );

    expect(rendered).toContain("- Integration rows (ATDD-owned): 0 (unfinished: 0)");
    expect(rendered).not.toContain("undefined");
  });

  it("prints the missing-row line for a spec whose ledger seeds nothing", async () => {
    const rendered = await withSpec(
      async (root) => formatReportMarkdown(await createReportData(root)),
      { testCases: L3_ONLY_TC_TABLE, tdd: ledger([]) },
    );

    expect(rendered).toContain("- Integration rows (ATDD-owned): 0 (unfinished: 0)");
    expect(rendered).toContain(
      "- integration-level TCs with no Integration row (seed in /qfai-sdd Phase 2b): TC-0001-0001",
    );
  });
});
