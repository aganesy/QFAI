/**
 * `qfai validate` and `qfai report` count the same test cases.
 *
 * The gate reads every `TC-ID` table plus the heading form; the report read the
 * first table only and gave up on the spec when it did not resolve. A spec
 * written as `## TC-0001` + `- Level: L1` therefore vanished from the report
 * while `TDDLIST_TC_NOT_COVERED` demanded a ledger row for it, and a TC in a
 * second table was gated but never counted.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { collectTddCoverage } from "../../src/core/reportTddCoverage.js";
import { collectSpecEntries } from "../../src/core/specLayout.js";
import { collectTestCaseIds } from "../../src/core/testCaseCoverageTargets.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

async function bothCommands(
  testCases: string,
  ledgerRows: string[],
): Promise<{ codes: string[]; total: number | null; done: number | null }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-shared-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      ["# TDD Test List", "", HEADERS, SEP, ...ledgerRows, ""].join("\n"),
      "utf-8",
    );

    const codes = (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
    const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
    const spec = coverage.specs.find((entry) => entry.specNumber === "0001");
    return { codes, total: spec?.unitComponentTotal ?? null, done: spec?.doneCount ?? null };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the report counts the test cases the gate gates", () => {
  it("counts a heading-form spec that has no TC table at all", async () => {
    const testCases = [
      "# 06 Test Cases",
      "",
      "## TC-0001",
      "",
      "- Level: L1",
      "",
      "## TC-0002",
      "",
      "- Level: L1",
      "",
    ].join("\n");

    const { codes, total, done } = await bothCommands(testCases, [
      "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | sel | done | | ev |",
    ]);

    // The gate owes TC-0002 a row and says so.
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
    // The report used to drop the spec entirely; it now prints the same two.
    expect(total).toBe(2);
    expect(done).toBe(1);
  });

  it("counts a TC declared in a second TC-ID table", async () => {
    const testCases = [
      "# 06 Test Cases",
      "",
      "## Test Case Table",
      "",
      "| TC-ID   | Level | Title |",
      "| ------- | ----- | ----- |",
      "| TC-0001 | L1    | one   |",
      "",
      "### BR-0002",
      "",
      "| TC-ID   | Level | Title |",
      "| ------- | ----- | ----- |",
      "| TC-0002 | L1    | two   |",
      "",
    ].join("\n");

    const { codes, total, done } = await bothCommands(testCases, [
      "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | sel | done | | ev |",
      "| TDD-0002 | TC-0002 | Unit | tests/a.test.ts | sel | done | | ev |",
    ]);

    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    expect(total).toBe(2);
    expect(done).toBe(2);
  });

  it("omits a spec that has no 06_Test-Cases.md rather than printing a zero row", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-shared-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
      expect(coverage.specs).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("an unrecognized Level is reported only where it is in force", () => {
  async function levelsFor(testCases: string): Promise<string[]> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tc-levels-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(specDir, { recursive: true });
      await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
      const { unrecognizedLevels } = await collectTestCaseIds(specDir);
      return [...unrecognizedLevels].sort();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("says nothing about a superseded duplicate heading", async () => {
    // First declaration wins, so the second heading's `Level` decides nothing.
    // `TDDLIST_UNKNOWN_LEVEL` says the value makes the TC a mandatory ledger
    // row — which is false for a TC whose in-force `Level` is the first one.
    const levels = await levelsFor(
      [
        "# 06 Test Cases",
        "",
        "## TC-0001",
        "",
        "- Level: L1",
        "",
        "## TC-0001",
        "",
        "- Level: bogus",
        "",
      ].join("\n"),
    );

    expect(levels).toEqual([]);
  });

  it("still reports the first declaration when it is the unrecognized one", async () => {
    const levels = await levelsFor(
      [
        "# 06 Test Cases",
        "",
        "## TC-0001",
        "",
        "- Level: bogus",
        "",
        "## TC-0001",
        "",
        "- Level: L1",
        "",
      ].join("\n"),
    );

    expect(levels).toEqual(["bogus"]);
  });

  it("says nothing about a superseded duplicate table row", async () => {
    const levels = await levelsFor(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID   | Level | Title |",
        "| ------- | ----- | ----- |",
        "| TC-0001 | L1    | one   |",
        "| TC-0001 | bogus | dup   |",
        "",
      ].join("\n"),
    );

    expect(levels).toEqual([]);
  });
});

describe("the report says when it cannot assess coverage", () => {
  async function reportFor(files: Record<string, string>): Promise<{
    unassessable?: string;
    exceptionRows: Array<{ tddId: string; drId: string }>;
    openCount: number;
  } | null> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-unassessable-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      for (const [rel, body] of Object.entries(files)) {
        const file = path.join(specDir, ...rel.split("/"));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, body, "utf-8");
      }
      const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
      return coverage.specs[0] ?? null;
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("does not print 0/0 for a spec whose TC table cannot be resolved", async () => {
    // `validate` reports `TDDLIST_TC_TABLE_UNRESOLVED` and skips coverage. The
    // report showed `coverage-target TCs: 0 / open: 0`, which beside a failing
    // gate reads as the gate being wrong.
    const spec = await reportFor({
      "06_Test-Cases.md": ["# 06 Test Cases", "", "## Notes", "", "no table here", ""].join("\n"),
      "tdd/test-list.md": [HEADERS, SEP, ""].join("\n"),
    });
    expect(spec?.unassessable).toContain("TC-ID");
  });

  it("does not score a ledger whose first table validate refuses to check", async () => {
    // A first table missing required columns stops `validateTddList` at Check
    // 3, so nothing past it is checked. The report skipped that table and
    // scored the schema-complete one below it as `open: 0`.
    const spec = await reportFor({
      "06_Test-Cases.md": [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      "tdd/test-list.md": [
        "| TDD-ID | Notes |",
        "| ------ | ----- |",
        "| TDD-0001 | explanatory table, not the ledger |",
        "",
        "## Ledger",
        "",
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | RED fail / GREEN pass |",
        "",
      ].join("\n"),
    });
    expect(spec?.unassessable).toContain("first table");
  });

  it("lists parked rows for a spec with no coverage-target TC", async () => {
    // The report ended before reading the ledger when the coverage set was
    // empty, so a spec whose TCs are all L3-L5 was printed with no `exception`
    // rows while `TDDLIST_EXCEPTION_PARKED` was naming them.
    const spec = await reportFor({
      "06_Test-Cases.md": [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L3 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      "tdd/test-list.md": [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | integration | tests/a.test.ts | a | exception | DR-0001 | - |",
        "",
      ].join("\n"),
    });
    expect(spec?.exceptionRows).toEqual([{ tddId: "TDD-0001", drId: "DR-0001" }]);
  });

  it("keeps a malformed first-table exception row in the roll-call", async () => {
    // `isRowShapeChecked` checks every row of the first table, including one
    // with no `TDD-ID`, so `TDDLIST_EXCEPTION_PARKED` names it by position. The
    // report dropped it, hiding an unapproved exception from the audit.
    const spec = await reportFor({
      "06_Test-Cases.md": [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      "tdd/test-list.md": [
        HEADERS,
        SEP,
        "|  | TC-0001 | unit | tests/a.test.ts | a | exception |  | - |",
        "",
      ].join("\n"),
    });
    expect(spec?.exceptionRows).toEqual([{ tddId: "", drId: "" }]);
  });
});

describe("a row with no Layer cannot discharge a TC", () => {
  it("is not counted as coverage", async () => {
    // The row has an id and a `TC-Refs` and nothing else. Every rule that
    // would police the placement keys on `Layer` and skips when it is empty —
    // the enum check, the forbidden-layer test, the Level/Layer crosswalk — so
    // it cleared `TDDLIST_TC_NOT_COVERED` with no test behind it and no rule
    // able to say so. An unknown but non-empty layer still counts, by design.
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      ["| TDD-0001 | TC-0001 |  |  |  |  | - | - |"],
    );
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });
});

describe("an unassessable spec publishes no counts in either format", () => {
  it("omits them from the serialized object, not only from the markdown", async () => {
    // `report --format json` serializes the spec object verbatim, so hiding
    // the numbers in the formatter left machine consumers reading progress
    // computed from rows the validator never accepted.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-json-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        ["# 06 Test Cases", "", "## Notes", "", "no table here", ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          HEADERS,
          SEP,
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | x |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
      const spec = coverage.specs[0];
      expect(spec?.unassessable).toBeDefined();
      expect(spec?.doneCount).toBeUndefined();
      expect(spec?.openCount).toBeUndefined();
      expect(spec?.unitComponentTotal).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("says so when the ledger's only table is missing required columns", async () => {
    // `firstTable` sets the verdict but `collectLedgerTables` is also empty in
    // that case, and the empty-ledger branch carried the other reason only.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-onetable-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        ["| TDD-ID | Notes |", "| ------ | ----- |", "| TDD-0001 | not the ledger |", ""].join(
          "\n",
        ),
        "utf-8",
      );

      const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
      expect(coverage.specs[0]?.unassessable).toContain("first table");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("a malformed TC reference discharges nothing", () => {
  it("does not let an over-long ref clear its real parent's obligation", async () => {
    // `resolveParentTcId` strips the last segment, so `TC-0001-0001-0001`
    // resolved to the real `TC-0001-0001`. Check 5 skips a token that fails
    // `TC_ID_TOKEN` instead of reporting it, so nothing named the typo either
    // — the TC was owed by neither gate on the strength of a malformed cell.
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      ["| TDD-0001 | TC-0001-0001-0001 | unit | tests/a.test.ts | a | todo | - | - |"],
    );
    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("still resolves a legitimate child reference to its parent", async () => {
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      ["| TDD-0001 | TC-0001-0001 | unit | tests/a.test.ts | a | todo | - | - |"],
    );
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
  });
});

describe("an incomplete later ledger table is reported, not dropped", () => {
  it("names the missing column instead of ignoring the table's rows", async () => {
    // `collectLedgerTables` admits only schema-complete tables, so an appended
    // `## CHG-…` section that mistyped one header contributed nothing — its
    // rows vanished from the gate and the report, and the first table's `done`
    // row read as the whole story. Check 3 only ever saw the first table, so
    // nothing named the omission either.
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      [
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | RED fail / GREEN pass |",
        "",
        "## CHG-001",
        "",
        "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID |",
        "| ------ | ------- | ----- | --------- | -------- | ------ | ----- |",
        "| TDD-0002 | TC-0001 | unit | tests/b.test.ts | b | todo | - |",
      ],
    );
    expect(codes).toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
  });

  it("says nothing about a table that is not a ledger attempt", async () => {
    // Two marker columns are what says "this was meant to be a ledger". A
    // documentation table beside the ledger is not one, and reporting it would
    // make the shipped template itself an error.
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      [
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | RED fail / GREEN pass |",
        "",
        "## Column reference",
        "",
        "| Column | Meaning |",
        "| ------ | ------- |",
        "| Status | the row's lifecycle state |",
      ],
    );
    expect(codes).not.toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
  });
});

describe("a mistyped marker column does not hide the table", () => {
  it("reports a later table that mistypes TC-Refs itself", async () => {
    // Keying the detector on two marker columns had the same escape one level
    // in: mistype `TC-Refs` and the table left both `collectIncompleteLedgerTables`
    // and `collectLedgerTables`, so the first table's `done` row was again the
    // whole story. A count has no such hole — one typo leaves seven of eight.
    const { codes } = await bothCommands(
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        "| TC-0001 | L1 | AC-0001 | - | s | e |",
        "",
      ].join("\n"),
      [
        "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | RED fail / GREEN pass |",
        "",
        "## CHG-001",
        "",
        "| TDD-ID | TC Ref | Layer | Test file | Selector | Status | DR-ID | Evidence |",
        "| ------ | ------ | ----- | --------- | -------- | ------ | ----- | -------- |",
        "| TDD-0002 | TC-0001 | unit | tests/b.test.ts | b | todo | - | - |",
      ],
    );
    expect(codes).toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
  });
});

describe("the report stops when a later ledger table is unreadable", () => {
  it("publishes no counts while the gate is failing on that table", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-report-incomplete-"));
    try {
      const specsRoot = path.join(root, ".qfai", "specs");
      const specDir = path.join(specsRoot, "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table",
          "",
          "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
          "| ----- | ----- | ------- | ------ | ----- | -------- |",
          "| TC-0001 | L1 | AC-0001 | - | s | e |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          HEADERS,
          SEP,
          "| TDD-0001 | TC-0001 | unit | tests/a.test.ts | a | done | - | RED fail / GREEN pass |",
          "",
          "## CHG-001",
          "",
          "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID |",
          "| ------ | ------- | ----- | --------- | -------- | ------ | ----- |",
          "| TDD-0002 | TC-0001 | unit | tests/b.test.ts | b | todo | - |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
      const spec = coverage.specs[0];
      expect(spec?.unassessable).toContain("missing required columns");
      expect(spec?.doneCount).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
