/**
 * A row that claims completion names the test case it discharges.
 *
 * `TC-Refs` carries the ledger's half of the Article V chain: `TC` is what ties
 * a business rule to the tests that answer it. A completed row naming no case is
 * one nothing can trace, and every check built on the column passes over it —
 * they read the refs the cell holds, and a cell holding none has nothing to
 * disagree with.
 *
 * Six of the rows below name a REQUIREMENT instead, which is the shape that
 * shows why an empty cell is not the whole of it: `REQ-0012-0075 (REQ-0109
 * follow-up)` fills the column, reads as a reference, and ties the row to no
 * case at all. So the check asks for the identifier's shape rather than for the
 * cell to be non-empty.
 *
 * **Rows that have not claimed completion are outside this.** A `todo` row may
 * not have its case yet, 191 of them do not, and reporting those would bury the
 * thirty-four that claim one.
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

/**
 * The completed rows already naming no test case.
 *
 * A backlog, not permission. The list may only shrink: the assertion is an
 * equality, so a row repaired without its entry being struck fails exactly as a
 * new one does.
 */
const KNOWN_WITHOUT_A_TEST_CASE: readonly string[] = [
  "spec-0004 TDD-0044 done",
  "spec-0004 TDD-0045 done",
  "spec-0004 TDD-0046 done",
  "spec-0006 TDD-0019 done",
  "spec-0006 TDD-0020 done",
  "spec-0012 TDD-0420 done",
  "spec-0012 TDD-0460 done",
  "spec-0012 TDD-0461 done",
  "spec-0012 TDD-0462 done",
  "spec-0012 TDD-0463 done",
  "spec-0012 TDD-0473 done",
  "spec-0012 TDD-0474 done",
  "spec-0012 TDD-0475 done",
  "spec-0012 TDD-0476 done",
  "spec-0012 TDD-0490 done",
  "spec-0012 TDD-0491 done",
  "spec-0012 TDD-0492 done",
  "spec-0012 TDD-0493 done",
  "spec-0012 TDD-0494 done",
  "spec-0012 TDD-0495 done",
  "spec-0012 TDD-0496 done",
  "spec-0012 TDD-0497 done",
  "spec-0012 TDD-0509 done",
  "spec-0012 TDD-0510 done",
  "spec-0012 TDD-0511 done",
  "spec-0012 TDD-0512 done",
  "spec-0012 TDD-0513 done",
  "spec-0012 TDD-0514 done",
  "spec-0012 TDD-0515 done",
  "spec-0012 TDD-0516 done",
  "spec-0012 TDD-0517 done",
  "spec-0013 TDD-0022 done",
  "spec-0015 TDD-0020 done",
  "spec-0015 TDD-0021 done",
];

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
        found.push(`${pack} ${tdd} ${status}`);
      }
    }

    expect(rowsRead, "no ledger rows were read").toBeGreaterThan(0);
    expect(found.sort()).toEqual([...KNOWN_WITHOUT_A_TEST_CASE].sort());
  });
});
