import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { resolveTestCaseTable } from "../../src/core/specPackParsers.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const TC_TABLE = [
  "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
  "| ------- | ----- | ------- | ------- | ------ | ---------- | ------ |",
  "| TC-0001 | unit  | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
];

/** An explanatory table an author places above `## Test Case Table`. */
const INTRUDING_TABLE = [
  "| TC-ID   | Purpose        |",
  "| ------- | -------------- |",
  "| TC-9999 | legend example |",
];

describe("resolveTestCaseTable", () => {
  it("prefers the table inside the named section over an earlier one", () => {
    const doc = [
      "# 06 Test Cases",
      "",
      "## Legend",
      "",
      ...INTRUDING_TABLE,
      "",
      "## Test Case Table (required)",
      "",
      ...TC_TABLE,
      "",
    ].join("\n");

    const resolved = resolveTestCaseTable(doc);
    expect(resolved.table?.rows[0]?.[0]).toBe("TC-0001");
    expect(resolved).toMatchObject({ source: "section" });
  });

  it("stops the section at the next same-level heading", () => {
    const doc = [
      "## Test Case Table",
      "",
      ...TC_TABLE,
      "",
      "## Appendix",
      "",
      "| TC-ID   | Note |",
      "| ------- | ---- |",
      "| TC-8888 | out  |",
      "",
    ].join("\n");

    const resolved = resolveTestCaseTable(doc);
    expect(resolved.table?.rows.map((row) => row[0])).toEqual(["TC-0001"]);
  });

  it("falls back to the first TC-ID-bearing table when the heading is absent", () => {
    const doc = [
      "# 06 Test Cases",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      ...TC_TABLE,
    ].join("\n");

    const resolved = resolveTestCaseTable(doc);
    expect(resolved.table?.rows[0]?.[0]).toBe("TC-0001");
    expect(resolved).toMatchObject({ source: "header-match" });
  });

  it("reports why resolution failed instead of returning an empty table", () => {
    expect(resolveTestCaseTable("# 06 Test Cases\n\nno tables here\n")).toEqual({
      table: null,
      reason: "no-table",
    });
    expect(
      resolveTestCaseTable(
        ["## Test Case Table", "", "| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
      ),
    ).toEqual({ table: null, reason: "no-tc-id-column" });
  });
});

describe("validateTddList TC extraction", () => {
  const withProject = async (fn: (root: string) => Promise<void>): Promise<void> => {
    const root = path.join(os.tmpdir(), `qfai-tc-table-${Math.random().toString(36).slice(2, 10)}`);
    await mkdir(root, { recursive: true });
    try {
      await fn(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };

  const seed = async (root: string, testCases: string, testList: string): Promise<void> => {
    const specsDir = path.join(root, ".qfai", "specs");
    const specDir = path.join(specsDir, "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await mkdir(path.join(specsDir, "_policies"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), testList, "utf-8");
  };

  const LEDGER = [
    "| TDD-ID   | TC-Refs | Layer | Test file    | Selector | Status | DR-ID | Evidence |",
    "| -------- | ------- | ----- | ------------ | -------- | ------ | ----- | -------- |",
    "| TDD-0001 | TC-0001 | unit  | tests/a.test.ts | case a | todo   | -     | -        |",
  ].join("\n");

  it("does not treat an intruding table's IDs as the known TC set", async () => {
    await withProject(async (root) => {
      await seed(
        root,
        [
          "# 06 Test Cases",
          "",
          "## Legend",
          "",
          ...INTRUDING_TABLE,
          "",
          "## Test Case Table (required)",
          "",
          ...TC_TABLE,
          "",
        ].join("\n"),
        LEDGER,
      );

      const issues = await validateTddList(root, defaultConfig);
      // TC-0001 is real and covered; TC-9999 belongs to the legend table only.
      expect(issues.some((entry) => entry.code === "TDDLIST_UNKNOWN_REF")).toBe(false);
      expect(issues.some((entry) => entry.code === "TDDLIST_TC_NOT_COVERED")).toBe(false);
    });
  });

  it("warns instead of failing open when no TC-ID column can be found", async () => {
    await withProject(async (root) => {
      await seed(
        root,
        [
          "# 06 Test Cases",
          "",
          "## Test Case Table (required)",
          "",
          "| A | B |",
          "| --- | --- |",
          "| 1 | 2 |",
          "",
        ].join("\n"),
        LEDGER,
      );

      const issues = await validateTddList(root, defaultConfig);
      const warning = issues.find((entry) => entry.code === "TDDLIST_TC_TABLE_UNRESOLVED");
      expect(warning?.severity).toBe("warning");
      expect(warning?.message).toContain("TC coverage checks skipped");
    });
  });

  it("stays quiet on a template-conformant spec", async () => {
    await withProject(async (root) => {
      await seed(
        root,
        ["# 06 Test Cases", "", "## Test Case Table (required)", "", ...TC_TABLE, ""].join("\n"),
        LEDGER,
      );

      const issues = await validateTddList(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "TDDLIST_TC_TABLE_UNRESOLVED")).toBe(false);
    });
  });
});
