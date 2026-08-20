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

/** The first code point of `⚠️`; the variation selector is not part of the comparison. */
const WARNING_HEAD = [..."⚠️"][0];

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

    // Every row must carry exactly one cell per column. Round 6 deleted a single pipe from one row:
    // `Oracle strength` slid into `Status`, the missing trailing cell was backfilled by the default,
    // every derived number stayed the same, and all five tests passed. A row of the wrong width is a
    // parse failure, not a row with a default in it.
    if (scores.length !== COLUMNS.length) {
      throw new Error(
        `row ${id} has ${String(scores.length)} cells, expected ${String(COLUMNS.length)}`,
      );
    }
    const cells: Record<string, Score> = {};
    scores.forEach((score, index) => {
      const column = COLUMNS[index];
      if (column === undefined) return;
      const head = [...score][0];
      // Anything that is not one of the three scores is a parse failure, not a `⚠️`. The first
      // version defaulted the unrecognized case to `⚠️`, which round 2's `implementation-reviewer`
      // flagged: a typo'd or empty cell would have been silently counted as the middle score, and
      // the totals this file exists to derive would have been derived from a guess.
      // `⚠️` is TWO code points (U+26A0 U+FE0F), so comparing a single code point against the
      // literal never matches — the trap this function's own docstring names, and the first version
      // of this check walked straight into it. Compare against the literal's FIRST code point.
      if (head !== "✅" && head !== "❌" && head !== WARNING_HEAD) {
        throw new Error(`unrecognized score ${JSON.stringify(score)} in ${id} / ${column}`);
      }
      cells[column] = head === "✅" ? "✅" : head === "❌" ? "❌" : "⚠️";
    });
    rows.push({ id, cells });
  }
  return rows;
}

/**
 * Parse the `Every ❌ cell, named` partition table into one entry per claimed cell.
 *
 * Rows look like `| A | US-0017-0004 | Normal path, Error path, … |`. The columns are named in full
 * so a member is checkable against the matrix table's own headers rather than against an abbreviation
 * only this file would understand.
 */
function parsePartition(text: string): Array<{ className: string; row: string; column: string }> {
  const members: Array<{ className: string; row: string; column: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\|\s*([A-Z])\s*\|\s*(US-\d{4}-\d{4})\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (match === null) continue;
    const [, className, row, columns] = match;
    if (className === undefined || row === undefined || columns === undefined) continue;
    for (const column of columns.split(",")) {
      const name = column.trim();
      if (name !== "") members.push({ className, row, column: name });
    }
  }
  return members;
}

describe("the spec-0017 Coverage Depth Matrix agrees with itself", () => {
  it("declares a Status total the table actually holds", async () => {
    const text = await readFile(MATRIX, "utf8");

    // The header first. `parseMatrix` maps cells by position and drops anything past `COLUMNS`, so a
    // column added to the record would carry cells no check here can see — round 5 planted a ninth
    // all-failing depth column and every test stayed green.
    const header = /^\|\s*US ID\s*\|(.+)\|\s*$/m.exec(text);
    expect(header, "the matrix must keep its pinned header form").not.toBeNull();
    const headings = (header?.[1] ?? "")
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell !== "");
    expect(
      headings,
      "a column added to the table needs a case in COLUMNS, or its cells are invisible here",
    ).toEqual([...COLUMNS]);

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

    // Every ❌ cell must fall in exactly one named class. Checking that by the class SIZES is not
    // checking it: round 2 broke the first version three ways — cutting a class's enumeration while
    // leaving its stated size, renaming a member to a cell the table scores ⚠️, and resizing two
    // halves so the sum survived — all green. So this reads the partition table's MEMBERS.
    const members = parsePartition(text);
    expect(members.length, "the partition table must declare members").toBeGreaterThan(0);

    const declared = new Set(members.map(({ row, column }) => `${row}/${column}`));
    const actual = new Set<string>();
    for (const row of rows) {
      for (const column of depth) if (row.cells[column] === "❌") actual.add(`${row.id}/${column}`);
    }

    // Disjoint: no cell claimed by two classes.
    expect(declared.size, "a cell may not be claimed by two reason classes").toBe(members.length);

    // Complete, and containing nothing else: set equality both ways, listed for a readable failure.
    const unclaimed = [...actual].filter((key) => !declared.has(key)).sort();
    const phantom = [...declared].filter((key) => !actual.has(key)).sort();
    expect(unclaimed, "every ❌ cell must be named by a reason class").toEqual([]);
    expect(phantom, "a reason class may not name a cell the table does not score ❌").toEqual([]);

    // And the stated per-class sizes must match the members actually listed — by EQUALITY, parsed.
    // The first version used `toContain` on a number, which round 3 broke twice: `"A 30"` is a
    // substring of `"A 300"`, so `A 300, B 70, C 10 — 380 cells` passed all four tests, and the total
    // after the em dash was never read at all.
    const sizes = new Map<string, number>();
    for (const { className } of members) sizes.set(className, (sizes.get(className) ?? 0) + 1);
    const statedSizes = /^Sizes, derived from the table above: \*\*(.+?)\*\*/m.exec(text);
    expect(statedSizes, "the section must state the sizes it derives").not.toBeNull();

    const statedText = statedSizes?.[1] ?? "";
    const statedPairs = new Map<string, number>();
    for (const match of statedText.matchAll(/\b([A-Z]) (\d+)\b/g)) {
      statedPairs.set(match[1] ?? "", Number(match[2]));
    }
    expect(
      Object.fromEntries([...statedPairs].sort()),
      "the stated class sizes must equal the members the table lists, not merely contain them",
    ).toEqual(Object.fromEntries([...sizes].sort()));

    const statedTotal = /—\s*(\d+) cells/.exec(statedText);
    expect(statedTotal, "the sizes line must state its own total").not.toBeNull();
    expect(Number(statedTotal?.[1]), "and that total must be the cell count").toBe(cells);

    // Class ASSIGNMENT, not just class membership. Round 3 permuted the B and C labels while
    // preserving both membership and sizes and the test stayed green — so the letter that carries a
    // cell's justification was unpinned, which is the only thing the classes are for. Each class has
    // a defining property, and every member must satisfy its own:
    //
    //   A  the shipped surface is absent, so the ROW's Status is ❌
    //   B  the harness cannot run a workflow: State transitions / Combinatorial on a row that is NOT ❌
    //   C  a single shipped value admits no boundary: Boundary values, and only on US-0017-0001
    const statusOf = new Map(rows.map((row) => [row.id, row.cells["Status"]]));
    const PROPERTIES: Record<string, (row: string, column: string) => boolean> = {
      A: (row) => statusOf.get(row) === "❌",
      B: (row, column) =>
        statusOf.get(row) !== "❌" &&
        (column === "State transitions" || column === "Combinatorial"),
      C: (row, column) => column === "Boundary values" && row === "US-0017-0001",
    };

    const misassigned: string[] = [];
    const unknownClass: string[] = [];
    for (const { className, row, column } of members) {
      const property = PROPERTIES[className];
      if (property === undefined) {
        // A class the table declares and this test does not know is a REVIEW item, not a pass and
        // not a silent failure: round 4 found that a newly discovered gap on a covered row had no
        // admissible class at all, so the check was over-constraining as well as under-checking.
        unknownClass.push(className);
        continue;
      }
      if (!property(row, column)) {
        misassigned.push(`${className}: ${row}/${column} (Status ${String(statusOf.get(row))})`);
      }
    }
    expect(
      misassigned,
      "each reason class has a defining property and every member must satisfy its own",
    ).toEqual([]);
    expect(
      unknownClass,
      "a new reason class needs its property added here — silently accepting it would let the letters " +
        "mean whatever the record says they mean",
    ).toEqual([]);

    // And the RECORD's own statement of each property must match what this test enforces. Round 4
    // broke the previous version twice without touching the table: swapping the class A and class B
    // reason PARAGRAPHS preserved table, partition, sizes and assignment while inverting the
    // record's central finding, and deleting class A's justification entirely — 30 of 38 cells' worth
    // of reason — was also green. The properties moved into the test and left the prose unpinned.
    const stated = new Map<string, string>();
    for (const match of text.matchAll(/^\*\*Class ([A-Z]) — property: (.+?)\.\s/gms)) {
      stated.set(match[1] ?? "", (match[2] ?? "").replace(/\s+/g, " ").trim());
    }
    const EXPECTED_PROSE: Record<string, string> = {
      A: "`Status = ❌`",
      B: "`Status ≠ ❌` and the column is `State transitions` or `Combinatorial`",
      C: "the column is `Boundary values` on `US-0017-0001`",
    };
    for (const className of Object.keys(PROPERTIES)) {
      expect(
        stated.get(className),
        `class ${className}'s justification must state the property this test enforces`,
      ).toBe(EXPECTED_PROSE[className]);
    }
    expect(
      [...stated.keys()].sort(),
      "every class the table uses must have a justification paragraph, and no more",
    ).toEqual(Object.keys(PROPERTIES).sort());

    // The property sentence is not the whole justification. Round 4's break swapped the explanatory
    // BODIES while leaving each label with its property, so a reader got class B's reason for the 30
    // cells class A covers — and nothing failed. Each body must carry a phrase only its own reason
    // would use, which is the cheapest check that survives a paragraph being moved wholesale.
    const BODY_PHRASE: Record<string, RegExp> = {
      A: /absent from the adopter's tree there is nothing to exercise/,
      B: /needs? a \*\*real run\*\*/,
      C: /no sequence, count or limit to sit at the edge of/,
    };
    const bodies = new Map<string, string>();
    for (const match of text.matchAll(
      /^\*\*Class ([A-Z]) — property:[\s\S]*?(?=^\*\*Class [A-Z] — property:|^## )/gm,
    )) {
      // Collapse the wrapping: these phrases straddle line breaks in the record.
      bodies.set(match[1] ?? "", match[0].replace(/\s+/g, " "));
    }
    for (const [className, phrase] of Object.entries(BODY_PHRASE)) {
      expect(
        bodies.get(className) ?? "",
        `class ${className}'s justification must carry its own reasoning, not another class's`,
      ).toMatch(phrase);
    }
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

  it("names the predicate version it describes, and keeps the reason the defect mattered", async () => {
    // The absence of the refuted "0 misclassified" figure is NOT asserted here any more, and that is a
    // deliberate hand-off rather than a relaxation. Round 6 found two problems with asserting it here:
    // the string was already present as `0` / `misclassified` across a line break and this pin passed
    // anyway, and the pin was in **direct conflict** with `retractedClaims.test.ts`, which permits the
    // figure inside a quotation — so a legal edit under one guard reddened the other. One rule, one
    // instrument: that file owns every refuted wording, with whitespace collapsed so reflow cannot
    // hide it. What stays here is what only this file can check.
    const text = await readFile(MATRIX, "utf8");

    expect(
      text,
      "the record must name the predicate version it describes, so a later reader can tell which",
    ).toMatch(/`?v6`?/);
    // The record wraps, so the phrase is matched over collapsed whitespace and either emphasis form.
    expect(
      text.replace(/\s+/g, " "),
      "and must keep the reason the naming defect mattered, which is the recurring one",
    ).toMatch(/how a script is [*_]?called[*_]? rather than what it [*_]?does[*_]?/);
  });

  it("records the withdrawn US-0017-0007 claim rather than scoring it as covered", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    const row = rows.find((candidate) => candidate.id === "US-0017-0007");

    expect(row, "the withdrawn story stays in the matrix as the gap it is").toBeDefined();
    // A floor first: `every` over an empty map is vacuously true, so without this a row whose cells
    // failed to parse would pass the assertion below. Round 2's `implementation-reviewer` found it.
    expect(
      Object.keys(row?.cells ?? {}).length,
      "the row must have parsed into all eight columns before its scores mean anything",
    ).toBe(COLUMNS.length);
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
