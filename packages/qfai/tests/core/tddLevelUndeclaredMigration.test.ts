/**
 * A ledger row left behind by the previous coverage rule is reported.
 *
 * A TC that declares no `Level` used to be a coverage target, so `/qfai-sdd`
 * Phase 2b seeded a row for it. It is now owned by `QFAI-ATDD-112` alone —
 * but dropping it from the target set does not unwrite the rows already in an
 * upgraded project's ledger, and every other check keeps accepting them: the
 * TC is still declared, so Check 5 sees a known reference, and no rule looked
 * at the pairing. The `todo` row then still goes to `/qfai-implement` while
 * ATDD demands the same TC's annotated test under `tests/integration/**`,
 * which is the double ownership the new rule exists to end.
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

/** A `Level` column whose cell for TC-0001 is whatever `level` says. */
const tableWithLevel = (level: string): string =>
  [
    "# 06 Test Cases",
    "",
    "## Test Case Table",
    "",
    "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   |",
    "| ------- | ----- | ------- | ------- | ------ | ---------- |",
    `| TC-0001 | ${level.padEnd(5)} | AC-0001 | EX-0001 | step-1 | expected-1 |`,
    "",
  ].join("\n");

/** The same table with no `Level` column at all — the other undeclared shape. */
const TABLE_WITHOUT_LEVEL_COLUMN = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID   | AC-Refs | EX-Ref  | Steps  | Expected   |",
  "| ------- | ------- | ------- | ------ | ---------- |",
  "| TC-0001 | AC-0001 | EX-0001 | step-1 | expected-1 |",
  "",
].join("\n");

/** Heading form with no `- Level:` line: undeclared exactly as a blank cell is. */
const HEADING_WITHOUT_LEVEL = [
  "# 06 Test Cases",
  "",
  "## TC-0001",
  "",
  "- AC-Refs: AC-0001",
  "- Steps: step-1",
  "- Expected: expected-1",
  "",
].join("\n");

const ledger = (rows: string[]): string =>
  ["# TDD Test List", "", HEADERS, SEP, ...rows, ""].join("\n");

async function findingsFor(testCases: string, rows: string[]): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-undeclared-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), ledger(rows), "utf-8");
    return await validateTddList(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codesFor = async (testCases: string, rows: string[]): Promise<string[]> =>
  (await findingsFor(testCases, rows)).map((entry) => entry.code);

/**
 * A parent TC with no `Level`, and a sub-ID declared in its own right with one.
 *
 * The shape that separates "the row is a leftover" from "the row is what the
 * spec asked for": the sub-ID's own declaration is the one in force, so a row
 * citing it is a legitimate coverage row however its parent was written.
 */
const TABLE_WITH_LEVELLED_SUB_ID = [
  "# 06 Test Cases",
  "",
  "## Test Case Table",
  "",
  "| TC-ID        | Level | AC-Refs | EX-Ref  | Steps  | Expected   |",
  "| ------------ | ----- | ------- | ------- | ------ | ---------- |",
  "| TC-0001      |       | AC-0001 | EX-0001 | step-1 | expected-1 |",
  "| TC-0001-0001 | L1    | AC-0001 | EX-0001 | step-2 | expected-2 |",
  "",
].join("\n");

const UNIT_ROW = "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | sel | todo | | - |";

describe("a coverage row for a TC that declares no Level", () => {
  it("is reported when the Level cell is blank", async () => {
    const codes = await codesFor(tableWithLevel(""), [UNIT_ROW]);

    expect(codes).toContain("QFAI-TCLEVEL-001");
    // The TC is not a coverage target any more, so the row is surplus rather
    // than missing — both findings at once would be a contradiction.
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
  });

  it("is reported when 06_Test-Cases.md has no Level column", async () => {
    const codes = await codesFor(TABLE_WITHOUT_LEVEL_COLUMN, [UNIT_ROW]);

    expect(codes).toContain("QFAI-TCLEVEL-001");
  });

  it("is reported for a heading-form TC with no `- Level:` line", async () => {
    const codes = await codesFor(HEADING_WITHOUT_LEVEL, [UNIT_ROW]);

    expect(codes).toContain("QFAI-TCLEVEL-001");
  });

  it("is reported when the row's Layer states nothing", async () => {
    // The shape the old seeding produced: nothing derived the `Layer` of a row
    // seeded from an absent `Level`, so the cell names no owner at all.
    const codes = await codesFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001 |       | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).toContain("QFAI-TCLEVEL-001");
  });

  it("is reported when the row cites a decomposition sub-ID of the TC", async () => {
    // The shape an upgraded ledger most often has: Phase 2b seeded one row per
    // target, and `/qfai-implement` then split the work and cited the parts.
    // Check 5 accepts `TC-0001-0001` because it resolves to a declared parent,
    // and `qfai report` credits the parent's coverage from it — so comparing
    // the token directly here let the very rows this rule exists to name
    // escape it.
    const findings = await findingsFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
    ]);
    const codes = findings.map((entry) => entry.code);

    expect(codes).toContain("QFAI-TCLEVEL-001");
    // The sub-ID resolves to a declared TC, so it is not an unknown reference.
    expect(codes).not.toContain("TDDLIST_UNKNOWN_REF");
    // The TC that declares no `Level` is the parent, and it is the one written
    // in `06_Test-Cases.md`; naming the sub-ID would point at a row that file
    // does not contain.
    expect(findings.find((entry) => entry.code === "QFAI-TCLEVEL-001")?.refs).toEqual(["TC-0001"]);
  });

  it("names the parent once when a row cites two of its sub-IDs", async () => {
    const findings = await findingsFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001-0001, TC-0001-0002 | Unit | tests/a.test.ts | sel | todo | | - |",
    ]);

    const reported = findings.filter((entry) => entry.code === "QFAI-TCLEVEL-001");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.refs).toEqual(["TC-0001"]);
  });

  it("names the TC and points at the file that can clear it", async () => {
    const findings = await findingsFor(tableWithLevel(""), [UNIT_ROW]);

    const finding = findings.find((entry) => entry.code === "QFAI-TCLEVEL-001");
    expect(finding?.severity).toBe("warning");
    expect(finding?.refs).toEqual(["TC-0001"]);
    // `warning`, not `error`: an upgraded project did not write these rows by
    // hand and must not have its branch blocked on them.
    expect(finding?.file?.replace(/\\/g, "/")).toContain("tdd/test-list.md");
    expect(finding?.relatedFiles?.map((entry) => entry.replace(/\\/g, "/"))).toEqual([
      ".qfai/specs/spec-0001/06_Test-Cases.md",
    ]);
  });
});

describe("what the migration check leaves alone", () => {
  it("says nothing about an Integration row citing the same TC", async () => {
    // An undeclared `Level` routes to `tests/integration/**`; a ledger row on
    // that layer is the ATDD-owned representation of it, not a second claim.
    const codes = await codesFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001 | Integration | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing when the TC declares a coverage-target Level", async () => {
    const codes = await codesFor(tableWithLevel("L1"), [UNIT_ROW]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing when the TC declares a non-coverage Level", async () => {
    // `L3` is a declaration. It is ATDD's TC, but the row is a deliberate
    // entry rather than a leftover, and Check 5c / the crosswalk own it.
    const codes = await codesFor(tableWithLevel("L3"), [UNIT_ROW]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing about a row that cites no TC", async () => {
    const codes = await codesFor(tableWithLevel(""), [
      "| TDD-0001 | -       | Unit  | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing about a sub-ID whose parent declares a Level", async () => {
    // Resolving to the parent must not turn every decomposition row into a
    // migration warning: `TC-0001` declares `L1`, so its parts are ledger-owned
    // and the rows citing them are exactly what Phase 2b asked for.
    const codes = await codesFor(tableWithLevel("L1"), [
      "| TDD-0001 | TC-0001-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing about a sub-ID that declares its own Level", async () => {
    // The token's own declaration outranks its parent's silence, so the lookup
    // resolves against the declared TCs first and only then asks about `Level`.
    const codes = await codesFor(TABLE_WITH_LEVELLED_SUB_ID, [
      "| TDD-0001 | TC-0001-0001 | Unit  | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing about a malformed over-long reference", async () => {
    // `resolveParentTcId` strips one segment, so `TC-0001-0001-0001` would
    // resolve to `TC-0001-0001` and, hop by hop, look like the parent's
    // business. A typo must not raise a migration warning any more than it may
    // discharge a coverage obligation.
    const codes = await codesFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001-0001-0001 | Unit | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });

  it("says nothing about an Integration row citing a sub-ID", async () => {
    const codes = await codesFor(tableWithLevel(""), [
      "| TDD-0001 | TC-0001-0001 | Integration | tests/a.test.ts | sel | todo | | - |",
    ]);

    expect(codes).not.toContain("QFAI-TCLEVEL-001");
  });
});
