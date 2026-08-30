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
