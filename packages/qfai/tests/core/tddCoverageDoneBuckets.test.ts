/**
 * `qfai report` no longer counts unfinished rows as done (#386).
 *
 * `TDD_DONE_STATUSES` was `{"done", "green", "refactor"}`, so a row with a
 * passing test that had cleared neither blocking reviewer nor checkpoint
 * verification was reported as *done* — precisely the statuses
 * `qfai-implement` names as grounds for refusing to declare completion. The
 * bias was one-directional: the report was always more optimistic than the
 * ledger, never less, and the discount a reader would have to apply equals the
 * number of `green` + `refactor` rows, which the report did not print.
 *
 * In the field one spec stood at 20 `refactor` / 56 `todo` / 0 `done` and was
 * reported as 20 done.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectTddCoverage } from "../../src/core/reportTddCoverage.js";
import { collectSpecEntries } from "../../src/core/specLayout.js";
import { TDD_DONE_STATUSES, TDD_IN_REVIEW_STATUSES } from "../../src/core/tddHelpers.js";

const HEADERS = [
  "| TDD-ID   | TC-Refs      | Layer | Test file | Selector | Status | DR-ID | Evidence |",
  "| -------- | ------------ | ----- | --------- | -------- | ------ | ----- | -------- |",
];

const TEST_CASES = [
  "# 06 Test Cases",
  "",
  "| TC-ID        | Level | AC-Refs | Notes |",
  "| ------------ | ----- | ------- | ----- |",
  "| TC-0001-0001 | unit  | AC-0001 | n     |",
  "",
].join("\n");

type Row = { id: string; status: string; drId?: string };

async function coverageFor(rows: Row[]): Promise<{
  doneCount: number;
  inReviewCount: number;
  exceptionCount: number;
  openCount: number;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-buckets-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [
        ...HEADERS,
        ...rows.map(
          (r) =>
            `| ${r.id} | TC-0001-0001 | Unit | tests/a.test.ts | sel | ${r.status} | ${r.drId ?? "-"} | - |`,
        ),
      ].join("\n"),
      "utf-8",
    );
    const entries = await collectSpecEntries(path.join(root, ".qfai", "specs"));
    const { specs } = await collectTddCoverage(entries);
    const spec = specs.find((s) => s.specNumber === "0001");
    if (!spec) throw new Error("spec-0001 missing from coverage");
    return spec;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("TDD coverage buckets", () => {
  it("`done` means only `done`", () => {
    expect(Array.from(TDD_DONE_STATUSES)).toEqual(["done"]);
  });

  it("the passing-but-ungated statuses have their own set", () => {
    expect(Array.from(TDD_IN_REVIEW_STATUSES).sort()).toEqual(["green", "refactor", "review-fix"]);
    // The two measures must never be conflated again.
    for (const status of TDD_IN_REVIEW_STATUSES) {
      expect(TDD_DONE_STATUSES.has(status)).toBe(false);
    }
  });

  for (const status of ["green", "refactor", "review-fix"]) {
    it(`counts a lone \`${status}\` row as in-review, not done`, async () => {
      const spec = await coverageFor([{ id: "TDD-0001", status }]);

      expect(spec.doneCount).toBe(0);
      expect(spec.inReviewCount).toBe(1);
      expect(spec.openCount).toBe(0);
    });
  }

  it("counts a `done` row as done", async () => {
    const spec = await coverageFor([{ id: "TDD-0001", status: "done" }]);

    expect(spec.doneCount).toBe(1);
    expect(spec.inReviewCount).toBe(0);
    expect(spec.openCount).toBe(0);
  });

  it("keeps a TC open while any row is `todo`", async () => {
    const spec = await coverageFor([
      { id: "TDD-0001", status: "refactor" },
      { id: "TDD-0002", status: "todo" },
    ]);

    expect(spec.doneCount).toBe(0);
    expect(spec.inReviewCount).toBe(0);
    expect(spec.openCount).toBe(1);
  });

  it("keeps exception its own bucket, ahead of in-review", async () => {
    const spec = await coverageFor([
      { id: "TDD-0001", status: "exception", drId: "DR-0001-0001" },
      { id: "TDD-0002", status: "done" },
    ]);

    expect(spec.exceptionCount).toBe(1);
    expect(spec.doneCount).toBe(0);
    expect(spec.inReviewCount).toBe(0);
  });

  it("the four buckets partition the coverage-target TCs", async () => {
    const spec = await coverageFor([
      { id: "TDD-0001", status: "done" },
      { id: "TDD-0002", status: "green" },
    ]);

    expect(spec.doneCount + spec.inReviewCount + spec.exceptionCount + spec.openCount).toBe(1);
    expect(spec.inReviewCount).toBe(1);
  });
});
