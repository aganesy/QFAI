/**
 * One ledger, one vocabulary: what `qfai validate` and `qfai report` say about
 * the same row.
 *
 * `TDDLIST_EXCEPTION_PARKED` is a roll-call of every `Status=exception` ledger
 * row; the report's `- exception rows:` block is the same roll-call. Filtering
 * the report's list through the *coverage* predicate silently dropped every
 * parked row on an `api` / `e2e` layer — the two commands then disagreed about
 * one row, which is the defect the shared reader exists to prevent.
 *
 * The second block pins the other half: the layer list that makes a `TC-*`
 * placement illegal and the layer list that declines to score coverage from it
 * are one list, so a layer cannot be added to the rule and left out of the
 * arithmetic.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { collectTddCoverage } from "../../src/core/reportTddCoverage.js";
import { collectSpecEntries } from "../../src/core/specLayout.js";
import { TC_FORBIDDEN_LAYERS } from "../../src/core/tddHelpers.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file           | Selector | Status    | DR-ID     | Evidence |";
const SEP =
  "| -------- | ------- | ----- | ------------------- | -------- | --------- | --------- | -------- |";

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

/** Runs both commands over one on-disk spec, so their answers can be compared. */
async function bothCommands(rows: string[]): Promise<{
  codes: string[];
  parkedRowKeys: string[];
  exceptionRows: Array<{ tddId: string; drId: string }>;
  doneCount: number;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-parked-"));
  try {
    const specsRoot = path.join(root, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASE_TABLE, "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      ["# TDD Test List", "", HEADERS, SEP, ...rows, ""].join("\n"),
      "utf-8",
    );

    const findings = await validateTddList(root, defaultConfig);
    const parkedRowKeys = findings
      .filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED")
      .map((entry) => entry.dl_id ?? "");

    const coverage = await collectTddCoverage(await collectSpecEntries(specsRoot));
    const spec = coverage.specs.find((entry) => entry.specNumber === "0001");
    if (!spec) throw new Error("spec-0001 missing from coverage");
    return {
      codes: findings.map((entry) => entry.code),
      parkedRowKeys,
      exceptionRows: spec.exceptionRows,
      doneCount: spec.doneCount,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the report lists the parked rows the gate names", () => {
  it("keeps an E2E exception row in exceptionRows", async () => {
    // An E2E row records its obligation in `US-Refs`, so it carries no
    // `TC-Refs` and bears no coverage. It is still a ledger row, and parking it
    // is still the thing `TDDLIST_EXCEPTION_PARKED` exists to make visible.
    const { exceptionRows } = await bothCommands([
      "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts     | sel      | done      |           | ev       |",
      "| TDD-0002 | -       | E2E   | tests/e2e/a.spec.ts | sel      | exception | DR-0001   | ev       |",
    ]);

    expect(exceptionRows).toEqual([{ tddId: "TDD-0002", drId: "DR-0001" }]);
  });

  it("keeps an API exception row in exceptionRows", async () => {
    const { exceptionRows } = await bothCommands([
      "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts     | sel      | done      |           | ev       |",
      "| TDD-0003 | -       | API   | tests/api/a.test.ts | sel      | exception | DR-0002   | ev       |",
    ]);

    expect(exceptionRows).toEqual([{ tddId: "TDD-0003", drId: "DR-0002" }]);
  });

  it("names the same rows in validate and in report", async () => {
    const { parkedRowKeys, exceptionRows } = await bothCommands([
      "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts     | sel      | exception | DR-0001   | ev       |",
      "| TDD-0002 | -       | E2E   | tests/e2e/a.spec.ts | sel      | exception | DR-0002   | ev       |",
      "| TDD-0003 | -       | API   | tests/api/a.test.ts | sel      | exception | DR-0003   | ev       |",
      "| TDD-0004 | TC-0001 | Unit  | tests/b.test.ts     | sel      | todo      |           | -        |",
    ]);

    expect(parkedRowKeys).toEqual(["TDD-0001", "TDD-0002", "TDD-0003"]);
    expect(exceptionRows.map((row) => row.tddId)).toEqual(parkedRowKeys);
  });

  it("still counts only coverage-bearing rows toward the TC tallies", async () => {
    // The roll-call widened; the arithmetic did not. A `TC-*` on an E2E row is
    // a placement the schema forbids, so it must not resolve TC-0001.
    const { exceptionRows } = await bothCommands([
      "| TDD-0001 | TC-0001 | E2E   | tests/e2e/a.spec.ts | sel      | exception | DR-0001   | ev       |",
    ]);

    expect(exceptionRows).toEqual([{ tddId: "TDD-0001", drId: "DR-0001" }]);
  });
});

describe("the layers that reject a TC-Refs are the layers that do not score it", () => {
  // `tddList.ts` kept a private `TC_FORBIDDEN_LAYERS` and `tddHelpers.ts` a
  // private `TC_FORBIDDEN_LEDGER_LAYERS`, both `["api", "e2e"]`. Two copies let
  // the ledger call a placement illegal and still count coverage from it —
  // exactly the disagreement the shared reader was introduced to remove.
  // Driven off the exported set, so a layer added there has to move both rules.
  it.each([...TC_FORBIDDEN_LAYERS])(
    "rejects a TC-Refs on Layer=%s and refuses to score it",
    async (layer) => {
      const { codes, doneCount } = await bothCommands([
        `| TDD-0001 | TC-0001 | ${layer} | tests/${layer}/a.test.ts | sel      | done      |           | ev       |`,
      ]);

      expect(codes).toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
      // The illegal row does not discharge the TC in either command.
      expect(codes).toContain("TDDLIST_TC_NOT_COVERED");
      expect(doneCount).toBe(0);
    },
  );

  it("scores the same row once its Layer can host the obligation", async () => {
    const { codes, doneCount } = await bothCommands([
      "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts     | sel      | done      |           | ev       |",
    ]);

    expect(codes).not.toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
    expect(codes).not.toContain("TDDLIST_TC_NOT_COVERED");
    expect(doneCount).toBe(1);
  });
});
