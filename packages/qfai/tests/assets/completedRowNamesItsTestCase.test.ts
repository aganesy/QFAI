/**
 * A row that claims completion names the test case it discharges.
 *
 * `TC-Refs` carries the ledger's half of the Article V chain: `TC` is what ties
 * a business rule to the tests that answer it. A completed row naming no case is
 * one nothing can trace, and every check built on the column passes over it —
 * they read the refs the cell holds, and a cell holding none has nothing to
 * disagree with.
 *
 * An empty cell is not the whole of it. A requirement id such as
 * `REQ-0012-0075` fills the column, reads as a reference, and ties the row to no
 * case at all. So the check asks for the identifier's shape rather than for the
 * cell to be non-empty.
 *
 * **This test reads only the rows that claim completion.** `validate` reports
 * the same defect at every status as `QFAI-TDDLIST-022`; this test holds the
 * repository's own ledgers to it on the rows whose trace must already be
 * complete.
 *
 * **Nor are rows whose obligation is not a test case.** `/qfai-sdd` Phase 2b
 * seeds an `E2E` row per user story, an `API` row per `CON-API-*` contract and
 * an `Integration` row per `CON-DB-*` contract, each with `TC-Refs` = `-` and
 * its obligation in `US-Refs`, `CON-API-Refs` or `CON-DB-Refs`. Such a row
 * traces through that column, so an empty `TC-Refs` is its correct shape.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");

/**
 * The statuses that claim the row is finished.
 *
 * The same set `TDDLIST_TEST_FILE_MISSING` reads, and for the same reason: a row
 * saying it is done is a row whose trace has to be complete.
 */
const COMPLETED = new Set(["done", "green", "refactor", "review-fix"]);

const TEST_CASE = /TC-\d{4}-\d{4}/;

/** The columns that carry a row's obligation when it is not a test case. */
const OTHER_OBLIGATIONS: ReadonlyArray<readonly [string, RegExp]> = [
  ["US-Refs", /US-\d{4}-\d{4}/],
  ["CON-API-Refs", /CON-API-/],
  ["CON-DB-Refs", /CON-DB-/],
];

/**
 * The completed rows already naming no test case.
 *
 * A backlog, not permission. The list may only shrink: the assertion is an
 * equality, so a row repaired without its entry being struck fails exactly as a
 * new one does.
 */
const KNOWN_WITHOUT_A_TEST_CASE: readonly string[] = [];

describe("a row claiming completion names the test case it discharges", () => {
  it("reports every completed row whose TC-Refs holds no test case", async () => {
    const packs = (await readdir(SPECS, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("spec-"))
      .map((entry) => entry.name)
      .sort();
    expect(packs.length, "no spec packs were read").toBeGreaterThan(0);

    const found: string[] = [];
    let rowsRead = 0;
    for (const pack of packs) {
      let text: string;
      try {
        text = await readFile(path.join(SPECS, pack, "tdd", "test-list.md"), "utf-8");
      } catch {
        continue;
      }
      let headers: string[] | null = null;
      for (const line of text.split(/\r?\n/)) {
        if (!line.trimStart().startsWith("|")) {
          headers = null;
          continue;
        }
        const cells = line
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
        if (cells[0] === "TDD-ID") {
          headers = cells;
          continue;
        }
        if (headers === null) continue;
        const at = (name: string): string => {
          const index = headers === null ? -1 : headers.indexOf(name);
          return index < 0 ? "" : (cells[index] ?? "");
        };
        const tdd = at("TDD-ID");
        if (!/^TDD-\d{4}$/.test(tdd)) continue;
        rowsRead += 1;
        const status = at("Status").toLowerCase();
        if (!COMPLETED.has(status)) continue;
        if (TEST_CASE.test(at("TC-Refs"))) continue;
        if (OTHER_OBLIGATIONS.some(([column, id]) => id.test(at(column)))) continue;
        found.push(`${pack} ${tdd} ${status}`);
      }
    }

    expect(rowsRead, "no ledger rows were read").toBeGreaterThan(0);
    expect(found.sort()).toEqual([...KNOWN_WITHOUT_A_TEST_CASE].sort());
  });
});
