/**
 * A row that discharges a TC is checked wherever in the ledger it sits.
 *
 * Coverage is scored from every schema-shaped ledger table, but the checks that
 * make a `done` row trustworthy — its `Test file` exists, its `Evidence`
 * records a command, its `Status` is a legal value, its `TDD-ID` is unique,
 * a parked row names a `DR-ID` — read only the first table. A second table
 * could therefore clear `TDDLIST_TC_NOT_COVERED` with a `done` row pointing at
 * a file that does not exist and an empty `Evidence`, and full validation
 * passed. Counting a row as coverage and declining to check it is the same
 * fail-open in two halves.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

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

/** A ledger whose first table is empty and whose `## CHG-001` table holds `rows`. */
function appendedLedger(rows: string[]): string {
  return [
    "# TDD Test List",
    "",
    HEADERS,
    SEP,
    "",
    "## CHG-001",
    "",
    HEADERS,
    SEP,
    ...rows,
    "",
  ].join("\n");
}

async function findingsFor(ledger: string): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-later-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASE_TABLE, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger, "utf-8");
    return await validateTddList(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codesFor = async (ledger: string): Promise<string[]> =>
  (await findingsFor(ledger)).map((entry) => entry.code);

describe("a completion claim in an appended table is checked", () => {
  it("reports a Test file that does not exist", async () => {
    const codes = await codesFor(
      appendedLedger([
        "| TDD-0001 | TC-0001 | Unit  | tests/gone.test.ts | sel | done | | npx vitest run tests/gone.test.ts -> 1 passed |",
      ]),
    );

    // The row does discharge the TC — that part was already true.
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    expect(codes).toContain("TDDLIST_TEST_FILE_MISSING");
  });

  it("reports an empty Evidence cell", async () => {
    const codes = await codesFor(
      appendedLedger(["| TDD-0001 | TC-0001 | Unit  | tests/gone.test.ts | sel | done | | - |"]),
    );

    expect(codes).toContain("TDDLIST_EVIDENCE_EMPTY");
  });

  it("reports an illegal Status", async () => {
    const codes = await codesFor(
      appendedLedger(["| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | finished | | ev |"]),
    );

    expect(codes).toContain("TDDLIST_INVALID_STATUS");
  });

  it("reports a parked row with no DR-ID, and names it in the roll-call", async () => {
    const findings = await findingsFor(
      appendedLedger(["| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | exception | | ev |"]),
    );

    expect(findings.map((entry) => entry.code)).toContain("TDDLIST_EXCEPTION_MISSING_DR");
    const parked = findings.filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");
    expect(parked.map((entry) => entry.dl_id)).toEqual(["TDD-0001"]);
  });

  it("reports a blocked row that names no blocker", async () => {
    const codes = await codesFor(
      appendedLedger(["| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | blocked | | ev |"]),
    );

    expect(codes).toContain("TDDLIST_BLOCKED_MISSING_REF");
  });

  it("reports a TDD-ID duplicated across tables", async () => {
    const codes = await codesFor(
      [
        "# TDD Test List",
        "",
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
        "",
        "## CHG-001",
        "",
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/b.test.ts | sel | todo | | - |",
        "",
      ].join("\n"),
    );

    // `TDDLIST_EXCEPTION_PARKED` keys its per-row waiver on the TDD-ID, so an
    // id repeated in a later table silently made one waiver cover two rows.
    expect(codes).toContain("TDDLIST_DUPLICATE_ID");
  });

  it("reports an unknown TC reference in an appended table", async () => {
    const codes = await codesFor(
      appendedLedger([
        "| TDD-0001 | TC-9999 | Unit  | tests/a.test.ts | sel | todo | | - |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
      ]),
    );

    expect(codes).toContain("TDDLIST_UNKNOWN_REF");
  });

  it("says which ledger table a later-table finding sits in", async () => {
    const findings = await findingsFor(
      appendedLedger(["| TDD-0001 | TC-0001 | Unit  | tests/gone.test.ts | sel | done | | ev |"]),
    );

    const missing = findings.find((entry) => entry.code === "TDDLIST_TEST_FILE_MISSING");
    expect(missing?.message).toContain("ledger table 2, row 1");
  });

  it("leaves a line with no TDD-ID alone in a later table", async () => {
    // The coverage reader treats a blank `TDD-ID` outside the first table as
    // "this line is not a row", so checking its cells would report on something
    // the ledger does not treat as an entry.
    const codes = await codesFor(
      appendedLedger([
        "|          |         |       |                 |     | done |  |  |",
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
      ]),
    );

    expect(codes).not.toContain("TDDLIST_TEST_FILE_MISSING");
    expect(codes).not.toContain("TDDLIST_EVIDENCE_EMPTY");
  });
});
