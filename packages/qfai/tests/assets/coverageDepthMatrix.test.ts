/**
 * The Coverage Depth Matrix is a committed governance record, and round 1 of this spec's ATDD review
 * found it disagreeing with itself: the table's `Status` column read `✅ 2 / ⚠️ 2 / ❌ 5` while the
 * line under it declared `✅ 3 / ⚠️ 2 / ❌ 4`. Nine rows counted into eight slots. The file's own five
 * justification sections agreed with the table, not with the total.
 *
 * A stated total that nothing derives is a number nobody recomputes. These tests derive it — from
 * the table, by parsing the markdown the same way a reader would — so the two cannot part again.
 *
 * They also enforce the contract the matrix exists for: **one justification per `❌`**. That is a
 * per-cell obligation, not a per-row one, which is the other thing round 1 found: 38 depth cells were
 * `❌` and five justification sections existed. The matrix now partitions every `❌` cell into named
 * reason classes, and the class counts here must sum to the cells the table actually holds.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MATRIX = path.resolve(__dirname, "../../../../.qfai/evidence/coverage-depth-spec-0017.md");

const COLUMNS = [
  "Normal path",
  "Error path",
  "Boundary values",
  "Special values",
  "State transitions",
  "Combinatorial",
  "Oracle strength",
  "Status",
] as const;

type Score = "✅" | "⚠️" | "❌";
type Row = { id: string; cells: Record<string, Score> };

/**
 * Parse the matrix table into rows.
 *
 * The scores are emoji, and `⚠️` is two code points (U+26A0 U+FE0F) — a naive `trim()` comparison
 * against `"⚠️"` written without the variation selector silently fails to match, so the score is
 * identified by its first code point instead.
 */
function parseMatrix(text: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*US-\d{4}-\d{4}\s*\|/.test(line)) continue;
    const fields = line
      .split("|")
      .slice(1, -1)
      .map((field) => field.trim());
    const [id, ...scores] = fields;
    if (id === undefined) continue;
    const cells: Record<string, Score> = {};
    scores.forEach((score, index) => {
      const column = COLUMNS[index];
      if (column === undefined) return;
      const head = [...score][0];
      cells[column] = head === "✅" ? "✅" : head === "❌" ? "❌" : "⚠️";
    });
    rows.push({ id, cells });
  }
  return rows;
}

describe("the spec-0017 Coverage Depth Matrix agrees with itself", () => {
  it("declares a Status total the table actually holds", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    expect(rows.length, "nine user stories, nine rows").toBe(9);

    const tally: Record<Score, number> = { "✅": 0, "⚠️": 0, "❌": 0 };
    for (const row of rows) tally[row.cells["Status"] ?? "⚠️"] += 1;

    const declared = /Totals by `Status`: \*\*✅ (\d+) \/ ⚠️ (\d+) \/ ❌ (\d+)\*\*/.exec(text);
    expect(declared, "the file must state its Status totals in the pinned form").not.toBeNull();
    const stated = {
      "✅": Number(declared?.[1]),
      "⚠️": Number(declared?.[2]),
      "❌": Number(declared?.[3]),
    };

    expect(stated, "the declared total must equal the table's own Status column").toEqual(tally);
    expect(
      stated["✅"] + stated["⚠️"] + stated["❌"],
      "the three counts must account for every row, which is where ✅ 3 / ⚠️ 2 / ❌ 4 failed",
    ).toBe(rows.length);
  });

  it("names as many ❌ depth cells as the table holds", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);

    // Depth cells are every column except `Status`, which is the derived verdict rather than a
    // coverage dimension. The contract is one justification per ❌ cell.
    const depth = COLUMNS.filter((column) => column !== "Status");
    let cells = 0;
    for (const row of rows) {
      for (const column of depth) if (row.cells[column] === "❌") cells += 1;
    }

    const declaredCells = /^(\d+) depth cells are `❌`, plus (\d+) in `Status`\./m.exec(text);
    expect(
      declaredCells,
      "§ Every ❌ cell, named must state the count it partitions",
    ).not.toBeNull();
    expect(Number(declaredCells?.[1]), "the stated depth-cell count must be the measured one").toBe(
      cells,
    );

    const statusFailures = rows.filter((row) => row.cells["Status"] === "❌").length;
    expect(Number(declaredCells?.[2])).toBe(statusFailures);

    // Every ❌ cell must fall in exactly one named class, so the class sizes must sum to the total.
    const classes = [...text.matchAll(/^\*\*Class [A-Z] — .*?\((\d+) cells?\)\.\*\*/gm)].map(
      (match) => Number(match[1]),
    );
    expect(classes.length, "at least one reason class must be declared").toBeGreaterThan(0);
    expect(
      classes.reduce((sum, size) => sum + size, 0),
      "the classes partition the ❌ cells, so their sizes must sum to the cell count — this is what " +
        "caught 30 + 12 + 1 double-counting State transitions across two classes",
    ).toBe(cells);
  });

  it("carries a justification section for every ❌ status row", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    const failing = rows.filter((row) => row.cells["Status"] === "❌").map((row) => row.id);

    for (const id of failing) {
      const heading = new RegExp(`^### ${id} — .*: ❌`, "m");
      expect(heading.test(text), `${id} is ❌ and needs its own justification heading`).toBe(true);
    }

    // And no justification heading for a row that is not ❌ — a stale section from an earlier
    // scoring would read as a live justification.
    const headed = [...text.matchAll(/^### (US-\d{4}-\d{4}) — .*: ❌/gm)].map((match) => match[1]);
    expect(headed.sort()).toEqual(failing.sort());
  });

  it("records the withdrawn US-0017-0007 claim rather than scoring it as covered", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    const row = rows.find((candidate) => candidate.id === "US-0017-0007");

    expect(row, "the withdrawn story stays in the matrix as the gap it is").toBeDefined();
    expect(
      Object.values(row?.cells ?? {}).every((score) => score === "❌"),
      "a story no test covers cannot score above ❌ in any column",
    ).toBe(true);
    expect(text).toMatch(/withdrawn/i);

    // The ledger line must be gone too, or the matrix and the gate disagree.
    const ledger = await readFile(
      path.resolve(__dirname, "../../../../tests/e2e/qfai-traceability.md"),
      "utf8",
    );
    expect(
      ledger.includes("QFAI:SPEC-0017:US-0017-0007"),
      "a withdrawn claim must not keep certifying itself through the annotation ledger",
    ).toBe(false);
  });
});
