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
/**
 * The stage record, which RESTATES three of the matrix's derived numbers.
 *
 * Every check below measures from the matrix table and used to look for the statement only in the
 * matrix file — so the copies here were retyped, unread, and free to drift. Two numbers were in that
 * state (the `Status` totals and the `❌` depth-cell count) plus the sentence naming the predicate's
 * version. A number derived in one file and restated in another is derived in one file only.
 */
const RECORD = path.resolve(__dirname, "../../../../.qfai/evidence/atdd-spec-0017.md");

/**
 * Every occurrence of a stated form, across BOTH records, labelled by the file it came from.
 *
 * `matchAll` and not `exec`, for the reason this file has re-learnt three times: `exec` returns the
 * first match, so a second, older statement placed after the true one is invisible and the pin holds by
 * the accident of ordering.
 */
async function statements(
  pattern: RegExp,
): Promise<Array<{ file: string; match: RegExpMatchArray }>> {
  const out: Array<{ file: string; match: RegExpMatchArray }> = [];
  for (const file of [MATRIX, RECORD]) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(new RegExp(pattern.source, "g"))) {
      out.push({ file: path.basename(file), match });
    }
  }
  return out;
}

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

    // Both records, because both state it. The stage record's copy reads "derived ... so the two
    // cannot part again" and was read by nothing: the check opened the matrix only.
    const declared = await statements(
      /Totals by `Status`:\s+\*\*✅ (\d+) \/ ⚠️ (\d+) \/ ❌ (\d+)\*\*/,
    );
    expect(
      declared.map((entry) => entry.file),
      "both records must state the Status totals in the pinned form",
    ).toEqual(["coverage-depth-spec-0017.md", "atdd-spec-0017.md"]);

    const wrong: string[] = [];
    for (const { file, match } of declared) {
      const stated = {
        "✅": Number(match[1]),
        "⚠️": Number(match[2]),
        "❌": Number(match[3]),
      };
      if (JSON.stringify(stated) !== JSON.stringify(tally)) {
        wrong.push(
          `${file}: states ${JSON.stringify(stated)}, table holds ${JSON.stringify(tally)}`,
        );
      }
      // The three counts must account for every row, which is where ✅ 3 / ⚠️ 2 / ❌ 4 failed.
      const sum = stated["✅"] + stated["⚠️"] + stated["❌"];
      if (sum !== rows.length) {
        wrong.push(`${file}: the totals sum to ${String(sum)} against ${String(rows.length)} rows`);
      }
    }
    expect(wrong, "a stated Status total that the table does not hold").toEqual([]);
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

    // The stage record restates the same partition in its own words — "unchanged at 5 rows and 38
    // depth cells" — and nothing read it. Same numbers, second file, so same check: measured from the
    // table, sought wherever it is stated.
    const restated = await statements(/at (\d+) rows and (\d+)\s+depth cells/);
    expect(
      restated.map((entry) => entry.file),
      "the stage record must restate the ❌ partition in the pinned form",
    ).toContain("atdd-spec-0017.md");
    const disagreeing = restated
      .filter(({ match }) => Number(match[1]) !== statusFailures || Number(match[2]) !== cells)
      .map(
        ({ file, match }) =>
          `${file}: states ${match[1] ?? "?"} rows / ${match[2] ?? "?"} cells, table holds ` +
          `${String(statusFailures)} / ${String(cells)}`,
      );
    expect(disagreeing, "a restated ❌ partition the table does not hold").toEqual([]);

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

    // The version is DERIVED from the helper's own docstring, not written here as a literal. Round 7
    // found the literal pinning `v6` while the helper had moved to v7 — so correcting the record was
    // the edit that reddened this guard, and the guard was holding the record stale. It also matched
    // any `v6` anywhere, which the file's own version history guarantees forever.
    // The version comes from the helper's exported constant, not from the largest `vN` token in its
    // prose. Deriving it from prose closed round 7's literal-pin defect and left the residual round 9
    // named: a bump whose comment forgot to say the new number would leave both sides agreeing on the
    // old one. It also went wrong in the other direction the moment it was written about — a sentence
    // discussing a future `v13` made the pin demand v13 of the record.
    const { VERSION: current } = await import("../helpers/buildCommand.js");
    expect(current, "the helper must export its own version").toBeGreaterThan(0);

    // Anchored to the sentence that names the helper, not to the file. A bare `toContain` over the
    // whole record passes on the record's own version-history list — which gains a line per version by
    // convention, so `v10` appears there the moment v10 exists, whatever the describing sentence still
    // says. The pin would then be satisfied by the history of the defect rather than by its correction.
    // Round 7 required the anchor and round 8 measured it still missing.
    // `matchAll`, not `exec`. `exec` returns the FIRST match, so a second sentence naming an older
    // version - placed after the true one - was invisible, and the pin held only by the accident of
    // ordering. That is the `.exec` defect round 6 required fixed in this stage's guards and round 7
    // found still live at a third site, reintroduced here one round later by the fix for something else.
    // BOTH records carry this sentence and only one of them was read. Round 10 measured them
    // agreeing at v12 by luck; nothing prevented the unread copy from staying at v11 forever, which is
    // the same "derived in one file, retyped in another" shape as the two counts above.
    const naming: Array<{ file: string; version: number }> = [];
    for (const file of [MATRIX, RECORD]) {
      const flat = (await readFile(file, "utf8")).replace(/\s+/g, " ");
      for (const match of flat.matchAll(
        /`?v(\d+)`? lives in `packages\/qfai\/tests\/helpers\/buildCommand\.ts`/g,
      )) {
        naming.push({ file: path.basename(file), version: Number(match[1]) });
      }
    }
    expect(
      [...new Set(naming.map((entry) => entry.file))].sort(),
      "both records must name the predicate's version and its file, in the form " +
        "`vN` lives in `packages/qfai/tests/helpers/buildCommand.ts`",
    ).toEqual(["atdd-spec-0017.md", "coverage-depth-spec-0017.md"]);
    expect(
      naming.filter((entry) => entry.version !== current),
      `every such sentence must name the version the helper is at: v${String(current)}`,
    ).toEqual([]);
    // The record wraps, so the phrase is matched over collapsed whitespace and either emphasis form.
    expect(
      text.replace(/\s+/g, " "),
      "and must keep the reason the naming defect mattered, which is the recurring one",
    ).toMatch(/how a script is [*_]?called[*_]? rather than what it [*_]?does[*_]?/);
  });

  it("requires the restored US-0017-0007 claim to be carried by a test that asserts an effect", async () => {
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    const row = rows.find((candidate) => candidate.id === "US-0017-0007");

    expect(row, "the story keeps its row in the matrix").toBeDefined();
    // A floor first: `every` over an empty map is vacuously true, so without this a row whose cells
    // failed to parse would pass the assertion below. Round 2's `implementation-reviewer` found it.
    expect(
      Object.keys(row?.cells ?? {}).length,
      "the row must have parsed into all eight columns before its scores mean anything",
    ).toBe(COLUMNS.length);
    // The scores are the matrix owner's to raise now that the story is covered, so this no longer
    // demands all-❌ — it demands the row not claim more than the test delivers. `Oracle strength` is the
    // column the withdrawal turned on, and the new test's oracle is a measured effect, so ⚠️ or ✅ are
    // both defensible; what is not is a raised score with no test behind it, which the ledger check below
    // is what actually prevents.
    expect(Object.keys(row?.cells ?? {}), "the row must still carry every column").toHaveLength(
      COLUMNS.length,
    );
    // Anchored to the row's own justification section, not to the file. `toMatch(/withdrawn/i)` over
    // the whole record was satisfied by any occurrence anywhere — changing this very section's
    // "withdrawn" to "retired" left it green, which round 7 raised and round 8 measured.
    // `matchAll` here too, for the same reason: a second section for the same story would have been
    // unreachable, and only the first would have been checked.
    const sections = [
      ...text.matchAll(/#{2,4}[^\n]*US-0017-0007[^\n]*\n([\s\S]*?)(?=\n#{2,4} |$)/g),
    ];
    expect(
      sections.length,
      "the withdrawn story must have a justification section of its own",
    ).toBeGreaterThan(0);
    expect(
      sections
        .map((match) => (match[1] ?? "").replace(/\s+/g, " "))
        .filter((body) => !/withdrawn/i.test(body)),
      "every section for the withdrawn story must say the claim was withdrawn",
    ).toEqual([]);

    // The claim is restored, and this is the half that stops a restoration being a relapse. The
    // annotation ledger is a bare list of ids — `CR-20260820-0011` is on file about 127 entries in it
    // that no test carries — so a line there is not coverage. Three things must hold together.
    const ledger = await readFile(
      path.resolve(__dirname, "../../../../tests/e2e/qfai-traceability.md"),
      "utf8",
    );
    expect(
      ledger.includes("QFAI:SPEC-0017:US-0017-0007"),
      "the restored claim must be registered where the gate reads it",
    ).toBe(true);

    const carrier = await readFile(
      path.resolve(__dirname, "../e2e/spec0017RunnerParallelismE2E.test.ts"),
      "utf8",
    );
    expect(
      carrier.includes("QFAI:SPEC-0017:US-0017-0007"),
      "a real test file must carry the annotation, not only the ledger",
    ).toBe(true);

    // And the assertion must be over an EFFECT. The claim was withdrawn because its predecessor asserted
    // that a file exists — true of a project with no knobs in it at all — so a restored claim carried by
    // another existence check would be the same defect with a new file name. `vitest.knobs.ts` records a
    // declaration that "did nothing" while type-checking and emitting no warning; the distinguishing
    // property is that raising the axis changes what the runner does.
    expect(
      /peakConcurrency\(/.test(carrier),
      "the carrier must observe the pool's behaviour rather than read the configuration back",
    ).toBe(true);
    expect(
      /spawnSync\(/.test(carrier),
      "and it must run the runner, which is what makes the observation an effect",
    ).toBe(true);
  });
});
