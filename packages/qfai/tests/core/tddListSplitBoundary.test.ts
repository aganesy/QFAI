/**
 * `Boundary` is the identity cell of a split row.
 *
 * `spec-traceability-rules.md` makes the (`TC-*`, `Boundary`) pair the key a
 * Phase 2b reseed matches on: sibling rows of a matrix-shaped TC repeat one
 * `TC-Refs`, carry a serial `TDD-ID`, and hold a `Selector` that
 * `/qfai-implement` rewrites whenever a review-fix handback replaces the test.
 * The rule had no reader, so a ledger whose siblings left `Boundary` empty, or
 * spent one slug twice, passed `--fail-on error` and then had the next reseed
 * preserve `Status` and `Evidence` against whichever sibling it matched.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence | Boundary |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- | -------- |";

/** The same table without the optional `Boundary` column — the legacy shape. */
const LEGACY_HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const LEGACY_SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

const TEST_CASES = [
  "# 06 Test Cases",
  "",
  "| TC-ID   | Level | AC-Refs | Notes  |",
  "| ------- | ----- | ------- | ------ |",
  "| TC-0001 | unit  | AC-0001 | note-1 |",
  "| TC-0002 | unit  | AC-0002 | note-2 |",
  "",
].join("\n");

async function withLedger(lines: string[], assertion: (issues: Issue[]) => void): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-boundary-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const missing = (issues: Issue[]): Issue[] =>
  issues.filter((entry) => entry.code === "TDDLIST_SPLIT_BOUNDARY_MISSING");
const duplicate = (issues: Issue[]): Issue[] =>
  issues.filter((entry) => entry.code === "TDDLIST_SPLIT_BOUNDARY_DUPLICATE");

describe("the split row's Boundary identity", () => {
  it("asks nothing of a TC that owns a single row", async () => {
    // One row for a TC is already identified by that TC. Demanding the column
    // there would fail every non-matrix ledger in every existing project.
    await withLedger(
      [
        LEGACY_HEADERS,
        LEGACY_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | todo   | -     | -        |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });

  it("accepts sibling rows whose boundaries are named and distinct", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | below-min |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | zero     | todo   | -     | -        | zero      |",
        "| TDD-0003 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | above-max |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });

  it("reports sibling rows that name no boundary, as a warning", async () => {
    // A legacy ledger cannot be migrated before its `CR-*` is approved
    // (the re-split re-scopes rows), so this must not fail `--fail-on error`.
    await withLedger(
      [
        LEGACY_HEADERS,
        LEGACY_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        |",
      ],
      (issues) => {
        const found = missing(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe("warning");
        expect(found[0]?.message).toContain("TC-0001");
        expect(found[0]?.message).toContain("row 1, row 2");
        expect(found[0]?.suggested_action).toContain("CR-*");
      },
    );
  });

  it("counts a `-` placeholder as no boundary", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | below-min |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | -         |",
      ],
      (issues) => {
        const found = missing(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("1 of them name no Boundary");
      },
    );
  });

  it("reports two siblings claiming one slug, as an error", async () => {
    // Only a Phase 2b that already writes `Boundary` can author this, and it
    // leaves the two rows genuinely indistinguishable.
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | rejected |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | Rejected |",
      ],
      (issues) => {
        const found = duplicate(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe("error");
        expect(found[0]?.message).toContain('Boundary "rejected"');
        expect(found[0]?.message).toContain("row 1, row 2");
      },
    );
  });

  it("lets two different TCs share a slug", async () => {
    // The identity is the (`TC-*`, `Boundary`) pair, so a generic slug is free
    // to recur across TCs — which is exactly why `Boundary` alone cannot be
    // the reseed's match key.
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | a-miss   | todo   | -     | -        | not-found |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | a-ok     | todo   | -     | -        | found     |",
        "| TDD-0003 | TC-0002 | Unit  | tests/b.test.ts | b-miss   | todo   | -     | -        | not-found |",
        "| TDD-0004 | TC-0002 | Unit  | tests/b.test.ts | b-ok     | todo   | -     | -        | found     |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });
});
