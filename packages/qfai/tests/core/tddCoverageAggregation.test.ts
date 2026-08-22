/**
 * `qfai report` TDD coverage — resolution across a many-to-many ledger.
 *
 * A matrix TC must be decomposed into one TDD row per selector, so a single TC
 * legitimately spans several rows. Marking the TC resolved on the first
 * done-ish row printed `done: 1 / open: 0` while the remaining boundary rows
 * were still `todo`, i.e. mid-decomposition progress read as complete.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectTddCoverage } from "../../src/core/reportTddCoverage.js";
import { collectSpecEntries } from "../../src/core/specLayout.js";

const TC_TABLE = [
  "# 06 Test Cases",
  "",
  "| TC-ID        | Level | AC-Refs      | EX-Ref       | Title   |",
  "| ------------ | ----- | ------------ | ------------ | ------- |",
  "| TC-0001-0001 | unit  | AC-0001-0001 | EX-0001-0001 | title-1 |",
  "",
].join("\n");

function tddTable(rows: Array<{ id: string; tcRefs: string; status: string; drId?: string }>) {
  return [
    "# TDD Test List",
    "",
    "| TDD-ID   | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| -------- | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
    ...rows.map(
      (row) =>
        `| ${row.id} | ${row.tcRefs} | unit | tests/a.test.ts | sel | ${row.status} | ${row.drId ?? ""} | ev |`,
    ),
    "",
  ].join("\n");
}

async function collectFor(
  tdd: string,
  testCases: string = TC_TABLE,
  specMd = "# 01 Spec\n",
  options: { successor?: boolean } = {},
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tddcov-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    if (options.successor === true) {
      // A `Superseded-by` naming no spec — or one whose own lifecycle is not a
      // declared `active` — does not retire anything: the work would have moved
      // nowhere. The successor carries no `06_Test-Cases.md`, so it stays out
      // of the coverage set on the `fileMissing` branch.
      const successorDir = path.join(root, ".qfai", "specs", "spec-0002");
      await mkdir(successorDir, { recursive: true });
      await writeFile(
        path.join(successorDir, "01_Spec.md"),
        "# 01 Spec\n\n- Status: active\n",
        "utf-8",
      );
      await writeFile(path.join(successorDir, "02_User-stories.md"), "# 02\n", "utf-8");
    }
    await writeFile(path.join(specDir, "01_Spec.md"), specMd, "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
    await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), tdd, "utf-8");

    const entries = await collectSpecEntries(path.join(root, ".qfai", "specs"));
    return await collectTddCoverage(entries);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function coverageFor(tdd: string, testCases: string = TC_TABLE) {
  const coverage = await collectFor(tdd, testCases);
  const spec = coverage.specs.find((entry) => entry.specNumber === "0001");
  if (!spec) throw new Error("spec-0001 missing from coverage");
  return spec;
}

describe("TDD coverage resolution across duplicate TC rows", () => {
  it("keeps a TC open while any of its rows is unfinished", async () => {
    const spec = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", status: "todo" },
      ]),
    );

    expect(spec.unitComponentTotal).toBe(1);
    expect(spec.doneCount).toBe(0);
    expect(spec.openCount).toBe(1);
  });

  it("resolves the TC once every referencing row is done", async () => {
    const spec = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", status: "done" },
      ]),
    );

    expect(spec.doneCount).toBe(1);
    expect(spec.openCount).toBe(0);
  });

  it("reports a still-in-review row as in-review, not done (#386)", async () => {
    // `refactor` used to count toward `done`, so this printed `done: 1`.
    const spec = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", status: "refactor" },
      ]),
    );

    expect(spec.doneCount).toBe(0);
    expect(spec.inReviewCount).toBe(1);
    expect(spec.openCount).toBe(0);
  });

  it("counts a TC as exception only when its unfinished rows are all waived", async () => {
    const partial = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "exception", drId: "DR-0001-0001" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", status: "todo" },
      ]),
    );
    expect(partial.exceptionCount).toBe(0);
    expect(partial.openCount).toBe(1);

    const waived = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "exception", drId: "DR-0001-0001" },
        { id: "TDD-0002", tcRefs: "TC-0001-0001", status: "done" },
      ]),
    );
    expect(waived.doneCount).toBe(0);
    expect(waived.exceptionCount).toBe(1);
    expect(waived.openCount).toBe(0);
  });

  it("still resolves a single-row TC", async () => {
    const spec = await coverageFor(
      tddTable([{ id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" }]),
    );

    expect(spec.doneCount).toBe(1);
    expect(spec.openCount).toBe(0);
    expect(spec.missingTcRefs).toEqual([]);
  });

  it("keeps a parent-level TC open while one decomposed child row is unfinished", async () => {
    // The decomposition case the many-to-many form creates: `TC-0001` is the
    // coverage target, and its sub-IDs each own a row.
    const parentTcTable = [
      "# 06 Test Cases",
      "",
      "| TC-ID   | Level | AC-Refs | EX-Ref  | Title   |",
      "| ------- | ----- | ------- | ------- | ------- |",
      "| TC-0001 | unit  | AC-0001 | EX-0001 | title-1 |",
      "",
    ].join("\n");

    const partial = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" },
        { id: "TDD-0002", tcRefs: "TC-0001-0002", status: "todo" },
      ]),
      parentTcTable,
    );
    expect(partial.doneCount).toBe(0);
    expect(partial.openCount).toBe(1);

    const complete = await coverageFor(
      tddTable([
        { id: "TDD-0001", tcRefs: "TC-0001-0001", status: "done" },
        { id: "TDD-0002", tcRefs: "TC-0001-0002", status: "done" },
      ]),
      parentTcTable,
    );
    expect(complete.doneCount).toBe(1);
    expect(complete.openCount).toBe(0);
  });
});

describe("the report reads the ledger the gate reads", () => {
  // `qfai validate` scores coverage from every ledger table because
  // `/qfai-implement` appends one per change request. The report read only the
  // first, so the same file produced two answers: the gate passed while the
  // report printed the TC as missing and open. A CI progress figure that
  // contradicts the gate blocking the same branch is worse than none.
  const LEDGER_HEADER = [
    "| TDD-ID   | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |",
    "| -------- | ------- | ----- | --------- | -------- | ------ | ----- | -------- |",
  ];

  it("counts a done row in an appended change-request table", async () => {
    const spec = await coverageFor(
      [
        "# TDD Test List",
        "",
        ...LEDGER_HEADER,
        "| TDD-0001 | -       | unit  | tests/a.test.ts | sel | todo | | ev |",
        "",
        "## CHG-001",
        "",
        ...LEDGER_HEADER,
        "| TDD-0002 | TC-0001-0001 | unit | tests/b.test.ts | sel | done | | ev |",
        "",
      ].join("\n"),
    );

    expect(spec.doneCount).toBe(1);
    expect(spec.openCount).toBe(0);
    expect(spec.missingTcRefs).toEqual([]);
  });

  it("does not count a fenced template as progress", async () => {
    // The shared reader masks non-spec regions, so the report cannot be
    // inflated by a copy-paste template the gate already refuses to read.
    const spec = await coverageFor(
      [
        "# TDD Test List",
        "",
        ...LEDGER_HEADER,
        "",
        "```md",
        ...LEDGER_HEADER,
        "| TDD-0001 | TC-0001-0001 | unit | tests/a.test.ts | sel | done | | ev |",
        "```",
        "",
      ].join("\n"),
    );

    expect(spec.doneCount).toBe(0);
    expect(spec.missingTcRefs).toEqual(["TC-0001-0001"]);
  });

  it("ignores a line with no TDD-ID, exactly as the gate does", async () => {
    const spec = await coverageFor(
      [
        "# TDD Test List",
        "",
        ...LEDGER_HEADER,
        "",
        "## Notes",
        "",
        ...LEDGER_HEADER,
        "|  | TC-0001-0001 |  |  |  | done | | |",
        "",
      ].join("\n"),
    );

    expect(spec.doneCount).toBe(0);
    expect(spec.missingTcRefs).toEqual(["TC-0001-0001"]);
  });
});

describe("a retired spec's ledger is history, not progress", () => {
  const OPEN_ROW = tddTable([{ id: "TDD-0001", tcRefs: "TC-0001-0001", status: "todo" }]);

  it("counts the open rows of an active spec", async () => {
    const coverage = await collectFor(OPEN_ROW);
    expect(coverage.specs.map((spec) => spec.specNumber)).toEqual(["0001"]);
    expect(coverage.specs[0]?.openCount).toBe(1);
  });

  it("omits a superseded spec instead of reporting its rows as open work", async () => {
    // `validateTddList` demotes every finding on this ledger to `info` and
    // prints "no longer gates"; the report must not keep the same `todo` row on
    // the books, or the two commands disagree about one file.
    const coverage = await collectFor(
      OPEN_ROW,
      TC_TABLE,
      "# 01 Spec\n\n- Status: superseded\n- Superseded-by: spec-0002\n",
      { successor: true },
    );
    expect(coverage.specs).toEqual([]);
  });

  it("keeps counting a spec whose Superseded-by names no spec", async () => {
    // Nothing inherited the rows, so they are still open work. `report` and
    // `validate` agree here too: neither retires a spec on a dangling
    // `Superseded-by`.
    const coverage = await collectFor(
      OPEN_ROW,
      TC_TABLE,
      "# 01 Spec\n\n- Status: superseded\n- Superseded-by: spec-0002\n",
    );
    expect(coverage.specs.map((spec) => spec.specNumber)).toEqual(["0001"]);
    expect(coverage.specs[0]?.openCount).toBe(1);
  });
});

describe("collectTddCoverage stays off the package's public surface", () => {
  it("is not reachable from the published barrels", async () => {
    // `src/core/index.ts` re-exports `./report.js` with `export *`, and
    // `src/index.ts` re-exports core — so exporting the helper from report.ts
    // put it in `dist/index.d.ts` and made an internal aggregation signature
    // (`SpecEntry`, the on-disk ledger layout) part of the package API.
    const core: Record<string, unknown> = await import("../../src/core/index.js");
    const root: Record<string, unknown> = await import("../../src/index.js");
    expect(Object.keys(core)).not.toContain("collectTddCoverage");
    expect(Object.keys(root)).not.toContain("collectTddCoverage");
  });
});
