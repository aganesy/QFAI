/**
 * A fenced or commented-out table is not the ledger — in either direction.
 *
 * Check 2 read the first table in the *raw* file while `collectLedgerTables`
 * masks non-spec regions, so a `tdd/test-list.md` whose only schema-shaped
 * table sat inside a ```md fence failed open twice over: every row check ran
 * against rows inside the fence, and the coverage check found no ledger table
 * and skipped itself entirely. With L1/L2 excluded from `QFAI-ATDD-112`, that
 * left a copy-paste template as a complete substitute for a ledger under
 * `validate --profile full --fail-on error`.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";
const SAMPLE_ROW =
  "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel      | done   |       | ev       |";

const TEST_CASE_TABLE = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   |",
  "| ------- | ----- | ------- | ------- | ------ | ---------- |",
  "| TC-0001 | L1    | AC-0001 | EX-0001 | step-1 | expected-1 |",
  "",
].join("\n");

async function codesFor(ledger: string[]): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-masking-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASE_TABLE, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger.join("\n"), "utf-8");
    return (await validateTddList(root, defaultConfig)).map((entry) => entry.code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("a ledger whose only table is masked out is no ledger", () => {
  it.each([
    ["a fenced sample", ["```md", HEADERS, SEP, SAMPLE_ROW, "```"]],
    ["a commented-out table", ["<!--", HEADERS, SEP, SAMPLE_ROW, "-->"]],
  ])("reports %s as a missing table, not as the ledger", async (_label, body) => {
    const codes = await codesFor(["# TDD Test List", "", ...body, ""]);

    expect(codes).toContain("TDDLIST_TABLE_MISSING");
    // The row inside the fence is not an item, so nothing is said about its
    // `Test file`, its `Status` or its `Evidence`.
    expect(codes).not.toContain("TDDLIST_TEST_FILE_MISSING");
  });

  it("still owes the coverage-target TC a row", async () => {
    // The check used to be wrapped in `if (coverageTables.length > 0)`, so the
    // one case in which every TC is certainly uncovered was the one case it
    // stayed silent about.
    const codes = await codesFor([
      "# TDD Test List",
      "",
      "```md",
      HEADERS,
      SEP,
      SAMPLE_ROW,
      "```",
      "",
    ]);

    expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("reads the real table when a fenced sample sits above it", async () => {
    const codes = await codesFor([
      "# TDD Test List",
      "",
      "```md",
      HEADERS,
      SEP,
      "| TDD-9999 | TC-0009 | Bogus | -               | -        | done   |       | -        |",
      "```",
      "",
      "## Ledger",
      "",
      HEADERS,
      SEP,
      "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel      | todo   |       | -        |",
      "",
    ]);

    // The TC is covered by the real row, and the sample's bogus `Layer` and
    // unknown `TC-Refs` are not reported against the project.
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    expect(codes).not.toContain("TDDLIST_UNKNOWN_LAYER");
    expect(codes).not.toContain("TDDLIST_UNKNOWN_REF");
  });
});
