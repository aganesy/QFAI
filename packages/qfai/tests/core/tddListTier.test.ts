/**
 * The declared tier column (#499).
 *
 * `Tier` used to be free prose inside `Evidence` — a pointer cell, written last,
 * by the agent whose ceremony the tier decides — and an unrecorded tier meant
 * `T2`, the most expensive one. The cheap tier was therefore the only one that
 * cost a deliberate act to claim, and it went unclaimed.
 *
 * It is now a column the ledger author seeds beside `Layer`, blank or `-` reads
 * as `T1`, and it stays optional so an existing ledger without it is valid. The
 * one thing checkable here is that a *filled* cell names a tier: with blank
 * meaning the cheapest ceremony, an unrecognized value must not be read as
 * blank.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

type Issues = Awaited<ReturnType<typeof validateTddList>>;

async function withLedger(lines: string[], assertion: (issues: Issues) => void): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-tier-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const HEADERS =
  "| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence |";
const SEP =
  "| ------ | ------- | ----- | ---- | --------- | -------- | ------ | ----- | -------- |";

const BARE_HEADERS =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |";
const BARE_SEP = "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |";

const row = (tier: string): string =>
  `| TDD-0001 | TC-0001 | Unit | ${tier} | tests/a.test.ts | sel | todo | - | - |`;

const tierIssues = (issues: Issues): Issues =>
  issues.filter((i) => i.code === "TDDLIST_UNKNOWN_TIER");

describe("Tier", () => {
  it("is optional — a ledger without the column is valid", async () => {
    await withLedger(
      [
        BARE_HEADERS,
        BARE_SEP,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | sel | todo | - | - |",
      ],
      (issues) => {
        expect(tierIssues(issues)).toEqual([]);
        // Adding it to REQUIRED_COLUMNS would have invalidated every existing
        // ledger at severity `error`, exactly as it would have for
        // `Owning module`.
        expect(issues.some((i) => i.code === "TDDLIST_REQUIRED_COLUMN_MISSING")).toBe(false);
      },
    );
  });

  for (const tier of ["T1", "T2", "T3"]) {
    it(`accepts ${tier}`, async () => {
      await withLedger([HEADERS, SEP, row(tier)], (issues) => {
        expect(tierIssues(issues)).toEqual([]);
      });
    });
  }

  it("accepts a lower-cased tier", async () => {
    await withLedger([HEADERS, SEP, row("t2")], (issues) => {
      expect(tierIssues(issues)).toEqual([]);
    });
  });

  it("accepts `-` as not declared", async () => {
    await withLedger([HEADERS, SEP, row("-")], (issues) => {
      expect(tierIssues(issues)).toEqual([]);
    });
  });

  it("accepts an empty cell, which reads as T1", async () => {
    await withLedger([HEADERS, SEP, row("")], (issues) => {
      expect(tierIssues(issues)).toEqual([]);
    });
  });

  it("rejects a value outside the vocabulary", async () => {
    await withLedger([HEADERS, SEP, row("Tier 2")], (issues) => {
      const found = tierIssues(issues);
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe("error");
      expect(found[0]?.message).toContain("Tier 2");
      expect(found[0]?.suggested_action).toContain("read as `T1`");
    });
  });

  it("rejects an annotated tier rather than reading it as blank", async () => {
    // The failure this guards: `t2 (authz)` matches no tier. Treated as blank
    // it would hand an escalated row the batched T1 ceremony.
    await withLedger([HEADERS, SEP, row("t2 (authz)")], (issues) => {
      expect(tierIssues(issues)).toHaveLength(1);
    });
  });
});
