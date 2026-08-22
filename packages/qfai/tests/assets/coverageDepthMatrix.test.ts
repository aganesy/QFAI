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
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isQuotation, nextHeadingAt } from "../helpers/recordProse.js";

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

/**
 * A markdown bullet: any marker, any indent.
 *
 * **Not inside a blockquote.** `[ \\t>]*` let a `> - ` line match, which decided `shown or asserted`
 * a second time and decided it the OTHER way from `isQuotation` — sixty lines below the import of
 * `isQuotation`, in the file that imports it. A blockquoted roster entry is a quotation, the same as
 * everywhere else, and the leading `>` is now left to the one function that knows.
 *
 * **One copy.** Round 18 found `^- ` too narrow — `* `, `  - `, `> - ` and a tab-indented bullet each
 * carried a contradicting score through green — and fixed it at the site the finding named. Fifteen
 * lines away, in the same file and the same commit, the other copy kept `^- `, and round 19 walked
 * through it: the class C roster reddened on a true reason written with a `* ` marker. Two copies of
 * one rule, and the one nobody was looking at was wrong, which is the finding this stage has now
 * recorded six times about its own work.
 */
const BULLET = "^[ \\t]*[-*+] ";

/**
 * What each class C member's reason must be ABOUT, and the exact reason reviewed.
 *
 * Round 19 pinned a keyword, because distinctness alone let two swapped reasons pass. Round 20 showed
 * a keyword is not much more: round 15's REJECTED reason — "it is simply untested, no one has looked",
 * which is a class A or B claim and the opposite of what class C asserts — passes the moment the word
 * `fails` appears in it, and so do `**boundary.**` and `**fail.**`.
 *
 * So the reason is pinned as what it is: **a governance judgement, by digest**. Class C's whole claim
 * is that no future work turns the cell green, and nothing derives that — a human decides it, and the
 * digest is the record that a human did. Rewording means updating this line, which is the same cost
 * `ALLOWED_WORKFLOW_FILES` charges for changing a shipped byte, and for the same reason.
 *
 * The keyword stays beside it so a failure says which cell's argument went missing rather than only
 * that two hashes differ.
 */
const CLASS_C_REASON: ReadonlyMap<string, { readonly argues: RegExp; readonly digest: string }> =
  new Map([
    [
      "US-0017-0001/Boundary values",
      {
        argues: /\bboundar(?:y|ies)\b/i,
        digest: "dd4722d6c07b26cfbe4f169924743196a9ff4bd402e2c8404e747ff05456be0e",
      },
    ],
    [
      "US-0017-0007/Error path",
      {
        argues: /\bfail(?:ure|s|ed)?\b/i,
        digest: "c59038056ca5466a12c2aac03446155a0aa289440cff2031a1bc8ceefd4b24f0",
      },
    ],
  ]);

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

/** The heading of the `⚠️` partition, so the two tables are read from their own sections. */
const WARNING_SECTION = "## Every ⚠️ cell, named";

/** The heading of the `❌` partition. */
const CROSS_SECTION = "## Every ❌ cell, named";

/**
 * The text of one `##` section, ending at the next heading OUTSIDE a fenced block.
 *
 * `parsePartition` used to scan the whole document, which was correct while there was exactly one
 * partition table in it. There are two now, and a row-shaped line is a row-shaped line — so each
 * table is read from its own section or the two would merge, and the merge would look like a
 * completeness pass.
 */
function sectionOf(text: string, heading: string): string {
  const at = text.indexOf(heading);
  if (at === -1) return "";
  const end = nextHeadingAt(text, at);
  return end === -1 ? text.slice(at) : text.slice(at, end);
}

/**
 * Parse the `Every ❌ cell, named` partition table into one entry per claimed cell.
 *
 * Rows look like `| A | US-0017-0004 | Normal path, Error path, … |`. The columns are named in full
 * so a member is checkable against the matrix table's own headers rather than against an abbreviation
 * only this file would understand.
 * Scoped to ONE section: there are two partition tables now, and a row-shaped line is a
 * row-shaped line, so scanning the whole document would merge them — and the merge would read
 * as a completeness pass.
 *
 */
function parsePartition(
  text: string,
  heading: string,
): Array<{ className: string; row: string; column: string }> {
  const members: Array<{ className: string; row: string; column: string }> = [];
  for (const line of sectionOf(text, heading).split(/\r?\n/)) {
    // A class label may carry a digit. The cross partition uses A/B/C and the warning
    // partition W1..W4, and a single-letter capture silently matched none of the latter —
    // the table parsed to zero members, which the size check would have read as a pass had
    // the non-emptiness assertion above it not been there.
    const match = /^\|\s*([A-Z]\d*)\s*\|\s*(US-\d{4}-\d{4})\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
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
    const members = parsePartition(text, CROSS_SECTION);
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
    //   C  the cell is inapplicable by the design: an enumerated roster, one reason per member
    //
    // **Class C is a roster, and the two attempts before it are why.** Round 12 wrote C and D as two
    // classes, each stating its single member's COORDINATES as a property — which nothing can violate
    // except a different cell, so the assignment check this block exists for was vacuous for both, and
    // the two paragraphs contradicted each other about how many such cells the table held. Round 14
    // merged them under the computable property `not A and not B`; round 15 filed a plainly untested
    // cell under it, with the reason "no one has looked", and the suite stayed green.
    //
    // "Inapplicable by the design" is not derivable from a table of scores — it is a claim about the
    // thing the story describes — so no predicate over coordinates can decide it, and a predicate that
    // admits whatever the other two classes reject decides nothing. What a test CAN hold is the list of
    // cells someone has justified, which is the same move `ALLOWED_STEP_SHAPE` makes one instrument
    // over: enumerate our own surface, refuse the rest, and make an addition a review rather than a
    // silent pass. A new inapplicable cell reddens here until it is named in both places.
    const statusOf = new Map(rows.map((row) => [row.id, row.cells["Status"]]));
    // The cells this stage has justified as inapplicable by the design. Adding one is an edit here
    // AND a reason in the record, which is the review the previous two versions of this class skipped.
    const CLASS_C_ROSTER = new Set(["US-0017-0001/Boundary values", "US-0017-0007/Error path"]);
    const PROPERTIES: Record<string, (row: string, column: string) => boolean> = {
      A: (row) => statusOf.get(row) === "❌",
      B: (row, column) =>
        statusOf.get(row) !== "❌" &&
        (column === "State transitions" || column === "Combinatorial"),
      C: (row, column) => CLASS_C_ROSTER.has(`${row}/${column}`),
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
      // One sentence, as A and B are: the extractor reads up to the first sentence end, and the
      // clauses after it — that there is nothing to observe, and that the members are enumerated
      // because no score in this table can decide that — are enforced by the roster rather than by
      // a string comparison.
      C:
        "the cell is inapplicable by the design rather than untested, which is neither class A's " +
        "missing surface nor class B's missing harness",
    };
    for (const className of Object.keys(PROPERTIES)) {
      expect(
        stated.get(className),
        `class ${className}'s justification must state the property this test enforces`,
      ).toBe(EXPECTED_PROSE[className]);
    }

    // The ROSTER, which is what class C's coordinates were really pinning. A property that says "not A
    // and not B" cannot say WHICH cells are inapplicable, so the record must name each one and the
    // table must agree: a member the prose does not name is a cell reclassified without a reason, and a
    // name with no member is a reason for a cell that moved.
    // Named in CLASS C's OWN PARAGRAPH, not anywhere in the file. Round 17 moved a member's reason
    // into class A's paragraph and this stayed satisfied while the cell had no reason under the class
    // that claims it — the same defect as the two guards beside it, all three reading a wider region
    // than the claim they make.
    const classCAt = text.indexOf("**Class C — property:");
    expect(classCAt, "class C's paragraph must be findable").toBeGreaterThan(-1);
    const afterClassC = text.slice(classCAt + 1);
    // ANY heading level terminates the region, not an enumerated set of them. Each of these three
    // terminators was correct for today's document and one heading away from round 17's defect —
    // a region that ran past its section because the pattern did not match the heading that ended
    // it. "The region is part of the claim" was written into the record as a lesson while three
    // terminators still enumerated levels.
    // …and a heading is a heading only OUTSIDE a fence. Round 19 widened this from an enumeration of
    // levels to any level, and round 20 showed the widening opened the hole it closed: a `# comment`
    // inside a ```text block ended the section, so a phantom member hidden behind one was invisible —
    // round 15's finding, restored by the repair for round 19's. `nextHeadingAt` is the one place
    // that is decided now, and all three regions read it.
    const classCHeading = nextHeadingAt(afterClassC, 0);
    const classCNext = afterClassC.search(/^\*\*Class /m);
    const classCStop =
      [classCHeading, classCNext].filter((n) => n !== -1).sort((a, b) => a - b)[0] ?? -1;
    const classCBody = classCStop === -1 ? afterClassC : afterClassC.slice(0, classCStop);
    // The coordinates AND the reason after them. Matching the coordinates alone made the roster a list
    // of names: round 18 deleted a reason, swapped two reasons between members, and wrote coordinates
    // with no reason at all — every one of the three green. What class C claims is that each member has
    // ITS OWN reason, so the bullet must carry a bolded one and the reasons must be distinct.
    const reasons = new Map<string, string>();
    const ROSTER = new RegExp(
      BULLET + "`(US-0017-\\d{4})`\\s*×\\s*`([^`]+)`\\s*—\\s*\\*\\*([^*]+)\\*\\*",
      "gm",
    );
    for (const match of classCBody.matchAll(ROSTER)) {
      reasons.set(`${match[1] ?? ""}/${match[2] ?? ""}`, (match[3] ?? "").trim());
    }
    const namedInProse = new Set(reasons.keys());
    expect(
      [...new Set(reasons.values())].length,
      "each class C member needs its own reason, and two members sharing one is a reason for neither",
    ).toBe(reasons.size);
    // …and distinct is not the same as ITS OWN. See `CLASS_C_REASON_MUST_ARGUE`.
    expect(
      [...CLASS_C_REASON.keys()].sort(),
      "the pinned reasons and the roster must name the same members — a member with no pin is a " +
        "reason nothing checks, and a pin with no member is a check over nothing",
    ).toEqual([...reasons.keys()].sort());
    const offTopic: string[] = [];
    for (const [cell, pin] of CLASS_C_REASON) {
      const reason = reasons.get(cell) ?? "";
      if (!pin.argues.test(reason)) {
        offTopic.push(`${cell}: ${String(pin.argues)} does not match ${JSON.stringify(reason)}`);
        continue;
      }
      const digest = createHash("sha256").update(reason, "utf8").digest("hex");
      if (digest !== pin.digest) {
        offTopic.push(
          `${cell}: reviewed ${pin.digest.slice(0, 12)}…, reads ${digest.slice(0, 12)}…`,
        );
      }
    }
    expect(
      offTopic,
      "a class C reason that is not the reviewed one. Swapping two reasons leaves both distinct " +
        "and both on topic, and a one-word reason satisfies a keyword — the digest is what says a " +
        "human judged THIS sentence",
    ).toEqual([]);
    const classC = members
      .filter((member) => member.className === "C")
      .map((member) => `${member.row}/${member.column}`);
    expect(
      classC.filter((cell) => !namedInProse.has(cell)),
      "a class C cell the record does not name with its own reason",
    ).toEqual([]);
    // And the other direction, which the comment above already claimed and the check did not do:
    // a reason written for a cell that is not a member is a justification with nothing under it,
    // and it passed. The roster's whole point is that adding a member is a review; so is keeping
    // a reason for one that left.
    const classCStart = text.indexOf("**Class C — property:");
    expect(classCStart, "class C's paragraph must be findable").toBeGreaterThan(-1);
    const afterC = text.slice(classCStart + 1);
    // Same rule as the forward half above; two copies of one terminator is the shape this file keeps
    // finding, so they are corrected together.
    // Same rule as the forward half above; corrected together.
    const cHeading = nextHeadingAt(afterC, 0);
    const cNext = afterC.search(/^\*\*Class /m);
    const classCEnd = [cHeading, cNext].filter((n) => n !== -1).sort((a, b) => a - b)[0] ?? -1;
    const classCReasons = classCEnd === -1 ? afterC : afterC.slice(0, classCEnd);
    const inClassCSection = new Set(
      [...classCReasons.matchAll(/`(US-0017-\d{4})`\s*×\s*`([^`]+)`/g)].map(
        (match) => `${match[1] ?? ""}/${match[2] ?? ""}`,
      ),
    );
    expect(
      [...inClassCSection].filter((cell) => !classC.includes(cell)),
      "a class C reason in the record for a cell the table does not put in class C",
    ).toEqual([]);
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
      // Class-level, as A's and B's are. This pinned `no sequence, count or limit to sit at the edge
      // of` — one MEMBER's reason — so rescoring that cell would have demanded prose for a member the
      // class no longer has, while the property and the roster both stayed satisfied. What every member
      // shares is that no future work turns the cell green; which members there are is the roster's
      // question, and each member's own reason is checked by the naming rule below.
      C: /no future work on the story would turn green/,
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

  it("names every ⚠️ cell with a reason class, and only ⚠️ cells", async () => {
    // **The contract gap round 20 found, and the reason it was invisible.** `§ "Every ❌ cell, named"`
    // and the test above both key on `❌`, so a `⚠️` cell was outside the enumeration BY
    // CONSTRUCTION — `US-0017-0002` and `US-0017-0009` do not even have a justification section,
    // because the artifact writes one only for a row whose `Status` is `❌`. Fifteen depth cells said
    // "partially covered" and stopped, which is the value a reader most needs the reason for: `❌` at
    // least says "nothing here"; `⚠️` says "something here" and names neither half.
    //
    // The structural properties are the same three the `❌` partition carries — disjoint, complete,
    // and containing nothing the table does not score that way — so they are asserted the same way.
    // The reason CLASSES are not the same and are not shared: `❌`'s A/B/C are about why a behaviour
    // cannot be exercised, and a `⚠️` is a statement about a behaviour that partly IS.
    const text = await readFile(MATRIX, "utf8");
    const rows = parseMatrix(text);
    const depth = COLUMNS.filter((column) => column !== "Status");

    const members = parsePartition(text, WARNING_SECTION);
    expect(members.length, "the ⚠️ partition table must declare members").toBeGreaterThan(0);

    const declared = new Set(members.map(({ row, column }) => `${row}/${column}`));
    const actual = new Set<string>();
    for (const row of rows) {
      for (const column of depth) {
        // `parseMatrix` normalises a cell to the full "⚠️", while `WARNING_HEAD` is only its
        // first code point — the variation selector is the difference, and comparing against the
        // head made every declared member read as a phantom.
        if (row.cells[column] === "⚠️") actual.add(`${row.id}/${column}`);
      }
    }

    expect(declared.size, "a ⚠️ cell may not be claimed by two reason classes").toBe(
      members.length,
    );
    const unclaimed = [...actual].filter((key) => !declared.has(key)).sort();
    const phantom = [...declared].filter((key) => !actual.has(key)).sort();
    expect(unclaimed, "every ⚠️ cell must be named by a reason class").toEqual([]);
    expect(phantom, "a reason class may not name a cell the table does not score ⚠️").toEqual([]);

    // Sizes by equality, parsed — the `toContain`-on-a-number defect round 3 broke twice next door.
    const sizes = new Map<string, number>();
    for (const { className } of members) sizes.set(className, (sizes.get(className) ?? 0) + 1);
    const stated = /^Sizes of the ⚠️ classes: \*\*(.+?)\*\*/m.exec(text);
    expect(stated, "the ⚠️ section must state the sizes it derives").not.toBeNull();
    const statedPairs = new Map<string, number>();
    for (const match of (stated?.[1] ?? "").matchAll(/\b(W\d) (\d+)\b/g)) {
      statedPairs.set(match[1] ?? "", Number(match[2]));
    }
    expect(
      Object.fromEntries([...statedPairs].sort()),
      "the stated ⚠️ class sizes must equal the members the table lists",
    ).toEqual(Object.fromEntries([...sizes].sort()));
    const statedTotal = /—\s*(\d+) cells, one line each/.exec(stated?.[1] ?? "");
    expect(statedTotal, "the ⚠️ sizes line must state its own total").not.toBeNull();
    expect(Number(statedTotal?.[1]), "and that total must be the ⚠️ cell count").toBe(actual.size);

    // And each member needs a LINE of its own under the section, keyed by its coordinates — the
    // enumeration is what makes the count checkable, and a line is what makes it a reason. Without
    // this the table could name fifteen cells and say nothing about any of them, which is the state
    // round 20 found and this section exists to end.
    const section = sectionOf(text, WARNING_SECTION);
    const unexplained = members
      .filter(({ row, column }) => !new RegExp(`\`${row}\`\\s*×\\s*\`${column}\``).test(section))
      .map(({ row, column }) => `${row}/${column}`)
      .sort();
    expect(
      unexplained,
      "a ⚠️ cell named in the partition table with no line explaining it — the count without the " +
        "reason is what this section was added to stop",
    ).toEqual([]);
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
    // A floor first, because a row whose cells failed to parse would satisfy everything below it
    // vacuously. Round 2's `implementation-reviewer` found that shape. Written once — it used to be here
    // twice, the second copy left behind by the edit that deleted what the first was guarding.
    expect(
      Object.keys(row?.cells ?? {}),
      "the row must have parsed into all eight columns before its scores mean anything",
    ).toHaveLength(COLUMNS.length);

    // **A raised depth cell must be justified in the row's own section, by column name.**
    //
    // The previous comment here claimed this assertion "demands the row not claim more than the test
    // delivers" and that "a raised score with no test behind it" was prevented by the ledger check below.
    // Round 12 measured that false: raising `Oracle strength` one grade with the partition kept consistent
    // left all three guards green. The ledger check requires an annotation, a carrier file and two
    // function names — none of which constrains a score in any column.
    //
    // This is the matrix's own contract inverted. Today a `❌` needs a justification and a `✅` needs
    // nothing, so LOWERING a cell costs an explanation and RAISING one is free — which is the wrong way
    // round for a governance record whose failure mode is over-claiming. No test can check that a
    // justification is true; what this checks is that raising a cell is a deliberate act with a sentence
    // attached.
    // The section states a score per column, as `- **<Column> `<score>`** — …`, so the pin is the PAIR:
    // what the section says a column scores must be what the table gives it.
    //
    // A first version of this required only that a raised column be NAMED in the section — and the section
    // carries a bullet for all seven, so the check was vacuous for the one row it guards. A test that
    // cannot fail for its own subject is the defect it was written to fix, one level in.
    const depthColumns = COLUMNS.filter((column) => column !== "Status");
    // NOT whitespace-collapsed. The bullets are anchored at `^- ` now, so the newlines are what makes
    // the anchor mean anything — and collapsing them is what let the previous pattern match a mention
    // anywhere in the section. The two defects were one edit apart: an anchor with nothing to anchor
    // to. This pin covers the one row whose section states a score per column as a bullet; the other
    // rows argue their scores in prose, which no pattern can pair with a cell.
    // ANY heading level terminates the region, not an enumerated set of them. Each of these three
    // terminators was correct for today's document and one heading away from round 17's defect —
    // a region that ran past its section because the pattern did not match the heading that ended
    // it. "The region is part of the claim" was written into the record as a lesson while three
    // terminators still enumerated levels.
    // Through `nextHeadingAt` like the other two regions: a lookahead for `#{1,6}` cannot tell a
    // heading from a `#` inside a fenced block, and this row's section carries fenced samples.
    const rowHeading = text.search(/^### US-0017-0007/m);
    const rowStop = rowHeading === -1 ? -1 : nextHeadingAt(text, rowHeading);
    const rowSection =
      rowHeading === -1
        ? ""
        : text.slice(text.indexOf("\n", rowHeading) + 1, rowStop === -1 ? text.length : rowStop);
    expect(rowSection.length, "the row's justification section must be findable").toBeGreaterThan(
      0,
    );

    const disagreeing: string[] = [];
    for (const column of depthColumns) {
      // `\\*` is an escaped BACKSLASH followed by a quantifier — zero or more backslashes — not two
      // asterisks. The bold markers were optional by accident, so an unbolded mention of the column
      // earlier in the section matched first and masked a bullet that contradicts the table. One
      // doubled escape, in the pin the round-6 and round-7 findings exist to enforce.
      // EVERY bullet for the column, not the first. `.exec` reads one match, so a second bullet
      // contradicting the table passed — and a section that states one column's score twice is
      // exactly the state this pin exists to catch.
      // **Round 19: the marker enumeration was the wrong axis.** Round 18 closed `- `, `* `, `  - `,
      // `> - ` and a tab-indented bullet by widening the anchor to `^[ \t>]*[-*+] `, and four more
      // spellings walked straight through it — an ordered-list item, a table cell, `- - `, and a line
      // with NO marker at all at column 0, which renders as an ordinary bold paragraph and reads to a
      // human exactly as the bullet does. A closed enumeration of markers cannot be finished, because
      // markdown keeps admitting another way to start a line.
      //
      // So the marker is not read. **What asserts a score is the bolded pair**, wherever on the line
      // it sits, in either of the two spellings the record actually uses — the score inside the bold
      // or immediately after it. The second spelling is here because round 19 reddened a TRUE record
      // that used it: same column, same score, same claim, the code span one character outside the
      // asterisks.
      //
      // And a blockquoted line is EXEMPT, which reverses half of round 18's repair. Widening the
      // anchor to include `>` made this instrument call a quotation an assertion, while
      // `retractedClaims.test.ts` decides the same question the other way in words — a blockquote
      // renders AS a quotation, and that exemption is recorded there as deliberate. A record quoting
      // its own withdrawn score is the practice that file exists to require, and it was reddening a
      // required leg here. `isQuotation` is now the one place that decision is made.
      const escaped = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const ASSERTS = new RegExp(
        `\\*\\*${escaped} \`([^\`]+)\`\\*\\*|\\*\\*${escaped}\\*\\*\\s*\`([^\`]+)\``,
        "g",
      );
      // **Read over UNWRAPPED text, not physical lines.** The record is hand-wrapped at 100 columns,
      // so a bolded pair can straddle a newline — and round 20 planted a contradicting bullet that did,
      // which the per-line scan could not see, while rewrapping a TRUE bullet made it disappear too.
      // A claim about what a section says cannot depend on where its author pressed Enter.
      //
      // Quotations and fenced blocks are dropped FIRST, because unwrapping would otherwise splice a
      // quoted line onto the assertion above it.
      let fenced = false;
      const prose = rowSection
        .split("\n")
        .filter((line) => {
          if (/^\s{0,3}(?:```|~~~)/.test(line)) {
            fenced = !fenced;
            return false;
          }
          return !fenced && !isQuotation(line);
        })
        .join("\n")
        // A newline followed by indentation is a wrap; a blank line is a real break.
        .replace(/\n[ \t]+/g, " ");
      const all = [...prose.matchAll(ASSERTS)].map((match) => match[1] ?? match[2] ?? "");
      if (all.length > 1) {
        disagreeing.push(`${column}: the section states it ${String(all.length)} times`);
        continue;
      }
      const stated = all[0];
      const scored = row?.cells[column] ?? "";
      if (stated === undefined) {
        disagreeing.push(`${column}: the section states no score for it`);
        continue;
      }
      if (stated !== scored) {
        disagreeing.push(`${column}: the section says ${stated}, the table says ${scored}`);
      }
    }
    expect(
      disagreeing,
      "every depth column's score must agree between the table and the row's justification — a cell " +
        "raised without its sentence being rewritten is the over-claim this record exists to prevent",
    ).toEqual([]);
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
      "the story must have a justification section of its own",
    ).toBeGreaterThan(0);
    // The claim is RESTORED, so this demands the opposite of what it used to. It required the word
    // "withdrawn", which meant rewriting the matrix's stale sentences reddened a required CI leg — the
    // guard was updated for the restoration in one clause and left enforcing the withdrawal in another,
    // and it held the record away from the tree for a whole round.
    //
    // Two things, because the claim was withdrawn for being VACUOUS rather than misfiled: the section
    // must say it is restored, and it must name the file that carries it. A restoration that does not
    // name its carrier is the same defect wearing a new sentence.
    const bodies = sections.map((match) => (match[1] ?? "").replace(/\s+/g, " "));
    expect(
      bodies.filter((body) => !/restored|withdrawal is over|COVERED/i.test(body)),
      "every section for this story must record that the claim is restored",
    ).toEqual([]);
    expect(
      bodies.filter((body) => !/spec0017RunnerParallelismE2E/.test(body)),
      "and must name the test that carries it, because a claim with no named carrier is what was " +
        "withdrawn in the first place",
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
