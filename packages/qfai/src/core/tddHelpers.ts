/**
 * Shared constants and helpers for TDD list processing.
 *
 * The layer constants, the ledger-table reader and the TC-Refs / parent-ID
 * helpers are shared by the `tddList` validator and the report generator, which
 * is what keeps their classification identical. The status sets below are the
 * report generator's alone — the validator owns its own `VALID_STATUSES` and
 * does not read them.
 */
import type { MarkdownTable } from "./specPackParsers.js";
import { maskNonSpecRegions, parseAllMarkdownTables } from "./specPackParsers.js";

/**
 * Level values that ARE TDD coverage targets, in every spelling the shipped
 * artifacts use. `06_Test-Cases.md` writes `L1`…`L5`; the ledger schema and
 * the layer catalog write words. Both must classify identically.
 *
 * **Membership is lower-case only.** The artifacts write `L1` and `Unit`, but
 * the entries here are the normalized forms, so a caller MUST apply
 * `.trim().toLowerCase()` before `has()` — `UNIT_COMPONENT_LAYERS.has("L1")` is
 * `false`. Use {@link classifyCoverageLevel} or {@link isCoverageTargetLevel},
 * which normalize for you; reach for the raw set only to enumerate the
 * vocabulary.
 *
 * **Editing this set moves two gates, not one.** `atddTraceability.ts` uses it
 * as `NO_ATDD_OBLIGATION_LEVELS`: the levels named here are exactly the levels
 * `QFAI-ATDD-112` stops demanding an annotation for, because this ledger is
 * what picks them up instead. Adding a spelling here silences the ATDD gate for
 * it; removing one leaves it owed by ATDD and not by the ledger. The two are
 * one set on purpose — a spelling in neither is a `Level` no gate owns.
 */
export const UNIT_COMPONENT_LAYERS = new Set(["unit", "component", "l1", "l2"]);

/**
 * Layers explicitly excluded from TDD coverage targets.
 * Unknown Level values are conservatively included to avoid silent false negatives.
 *
 * The `l3` / `l4` / `l5` / `api` spellings are the same ATDD vocabulary the
 * TC-layer routing in `atddTraceability.ts` accepts. Without them a
 * `Level: L4` TC is unknown here, so `--profile full` counted it as a TDD
 * obligation and raised `TDDLIST_TC_NOT_COVERED` even when the TC carried its
 * correct `tests/api/**` annotation.
 *
 * **Membership is lower-case only**, on the same terms as
 * {@link UNIT_COMPONENT_LAYERS}: `NON_COVERAGE_LAYERS.has("L3")` is `false`.
 */
export const NON_COVERAGE_LAYERS = new Set([
  "integration",
  "e2e",
  "system",
  "acceptance",
  "api",
  "l3",
  "l4",
  "l5",
]);

export type LevelClassification = "coverage-target" | "non-coverage" | "unrecognized";

/**
 * Classifies a `Level` cell against the known vocabulary.
 *
 * Previously the check was exclusion-only against a word set the shipped
 * template never produces (`L1`…`L5` matched nothing), so the documented
 * "unit/component only" filter excluded no test case at all and
 * `TDDLIST_TC_NOT_COVERED` demanded a ledger row for every TC. Classifying
 * positively means an unrecognized value is *visible* rather than silently
 * becoming a coverage target.
 *
 * **An undeclared `Level` is not a coverage target.** A blank cell, and a
 * `06_Test-Cases.md` with no `Level` column at all, reach here as `""`, and
 * `atddTraceability.resolveAtddHomeKind(undefined)` already routes exactly that
 * TC to `tests/integration/**` and keeps `QFAI-ATDD-112` (`error`) on it —
 * deliberately, as the conservative answer for a `Level` qfai cannot read.
 * Answering `coverage-target` here as well made one TC a ledger coverage target
 * *and* an ATDD annotation obligation: two owners, two test trees, two evidence
 * files, and no derivable `Layer` for the row the ledger would seed, which is
 * what gate item 10 selects the evidence file by. The heading form already
 * behaved this way — a `## TC-0001` block with no `- Level:` line is claimed by
 * ATDD alone — so this is the table form joining it, not a new rule. The TC is
 * not thereby owed by nothing: it is owed by `QFAI-ATDD-112`.
 */
export function classifyCoverageLevel(level: string): LevelClassification {
  const normalized = level.trim().toLowerCase();
  if (normalized.length === 0) return "non-coverage";
  if (UNIT_COMPONENT_LAYERS.has(normalized)) return "coverage-target";
  if (NON_COVERAGE_LAYERS.has(normalized)) return "non-coverage";
  return "unrecognized";
}
/**
 * Determine whether a Level value should be treated as a coverage target.
 * An unrecognized value still returns `true` (conservative: avoids silent
 * coverage gaps) — callers that can report it should use
 * `classifyCoverageLevel` and surface the `unrecognized` case.
 */
export function isCoverageTargetLevel(level: string): boolean {
  return classifyCoverageLevel(level) !== "non-coverage";
}

/**
 * The only status that means an item is finished.
 *
 * This used to include `green` and `refactor`, so `qfai report` counted rows
 * toward `done:` that `qfai-implement` names as grounds for *refusing* to
 * declare completion. A `green` or `refactor` row has by construction not
 * cleared its blocking reviewers or checkpoint verification — exactly the
 * checks that separate "a test passes" from "this item is done". The bias was
 * one-directional (never pessimistic) and unbounded, since the discount equals
 * the number of `green` + `refactor` rows, which the report did not print.
 */
export const TDD_DONE_STATUSES = new Set(["done"]);

/**
 * Has a passing test, has not finished its gates.
 *
 * Kept as its own bucket rather than folded into either neighbour: "the test
 * passes" is real progress worth reporting, and conflating it with `done` is
 * what made the headline unusable.
 */
export const TDD_IN_REVIEW_STATUSES = new Set(["green", "refactor", "review-fix"]);

/**
 * The columns a table must carry to be a `tdd/test-list.md` ledger table.
 *
 * Lives here rather than in the validator because "is this a ledger table" is
 * the question `qfai validate` and `qfai report` have to answer identically:
 * they score the same file and a reader keys one against the other.
 */
export const TDD_LEDGER_REQUIRED_COLUMNS = [
  "TDD-ID",
  "TC-Refs",
  "Layer",
  "Test file",
  "Selector",
  "Status",
  "DR-ID",
  "Evidence",
];

/**
 * A ledger table that can carry coverage, with its column positions resolved.
 *
 * **Every index below is `>= 0`.** {@link collectLedgerTables} admits a table
 * only when it carries all of {@link TDD_LEDGER_REQUIRED_COLUMNS}, so the
 * lookups cannot miss — a `>= 0` guard at a call site reads as though a
 * schema-complete table might lack `TDD-ID`, which by construction it cannot,
 * and hid the real question (is this line an item?) behind a false one.
 * `headers` is trimmed once here so the optional columns can be resolved the
 * same way without re-trimming per check.
 */
export interface LedgerTable {
  table: MarkdownTable;
  /** Trimmed header cells, in column order. */
  headers: readonly string[];
  tcRefsIndex: number;
  layerIndex: number;
  tddIdIndex: number;
}

/**
 * How many of {@link TDD_LEDGER_REQUIRED_COLUMNS} a table must carry before a
 * missing one is read as an omission rather than as "not a ledger table".
 *
 * `collectLedgerTables` admits only schema-complete tables, and a table it
 * rejects contributes nothing — so an appended `## CHG-…` section that
 * mistyped one header had its rows vanish from both the gate and the report,
 * and a `done` row in the first table read as the whole story.
 *
 * No single test is enough, so three are applied and any one suffices:
 *
 * 1. **Both markers.** `TDD-ID` *and* `TC-Refs` together say "ledger" whatever
 *    else is absent.
 * 2. **Six of eight**, which says it for a table that mistyped one marker and
 *    kept the rest.
 * 3. **One marker and {@link TDD_LEDGER_MARKED_ATTEMPT_MIN_COLUMNS} columns**,
 *    for the gap the first two leave between them: a table that drops one
 *    marker *and* two other columns —
 *    `TDD-ID | Layer | Test file | Status | Evidence` is five columns with one
 *    marker, obviously able to hold ledger rows, and it passed neither test. A
 *    `done` row in the complete first table and a `todo` row here reported no
 *    missing column and no outstanding work, and the report published
 *    `done: 1 / open: 0` from the first table alone.
 *
 * A documentation table beside the ledger passes none of the three, so the
 * shipped template's own `## Schema` table (`Column | Description`) stays out.
 */
export const TDD_LEDGER_ATTEMPT_MIN_COLUMNS = 6;

/**
 * Columns required of a table that carries only *one* marker before it counts
 * as a ledger attempt.
 *
 * Four, so the marker is joined by three more of the schema — enough that a
 * two-column summary such as `TDD-ID | Status` is still read as a summary,
 * while every shape that could hold a row is caught.
 */
export const TDD_LEDGER_MARKED_ATTEMPT_MIN_COLUMNS = 4;

/** The two columns that are only ever a ledger's. See above. */
export const TDD_LEDGER_MARKER_COLUMNS: readonly string[] = ["TDD-ID", "TC-Refs"];

/** Ledger-shaped tables that are missing at least one required column. */
export function collectIncompleteLedgerTables(
  content: string,
): Array<{ headers: readonly string[]; missing: string[] }> {
  const incomplete: Array<{ headers: readonly string[]; missing: string[] }> = [];
  for (const table of parseAllMarkdownTables(maskNonSpecRegions(content))) {
    const headers = table.headers.map((header) => header.trim());
    const missing = TDD_LEDGER_REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
    const present = TDD_LEDGER_REQUIRED_COLUMNS.length - missing.length;
    const markers = TDD_LEDGER_MARKER_COLUMNS.filter((column) => headers.includes(column)).length;
    const isAttempt =
      markers === TDD_LEDGER_MARKER_COLUMNS.length ||
      present >= TDD_LEDGER_ATTEMPT_MIN_COLUMNS ||
      (markers > 0 && present >= TDD_LEDGER_MARKED_ATTEMPT_MIN_COLUMNS);
    if (!isAttempt) continue;
    if (missing.length > 0) {
      incomplete.push({ headers, missing });
    }
  }
  return incomplete;
}
/**
 * Every table in the ledger that can carry coverage.
 *
 * Two conditions, both of which a `TC-Refs`-column test alone failed:
 *
 * - **Non-spec regions are masked first.** A fenced template or a commented-out
 *   old table inside `test-list.md` is not the ledger, and reading it let an
 *   L1/L2 TC that has no real row count as covered — clearing the only `error`
 *   that still owes it now that `QFAI-ATDD-112` excludes L1/L2. The spec-side
 *   readers already mask; this one has to as well.
 * - **The table must carry the ledger schema.** A stray two-column table headed
 *   `TC-Refs` would otherwise count a TC as covered with no `TDD-ID`, no `Layer`
 *   and no `Test file` behind it. Requiring
 *   {@link TDD_LEDGER_REQUIRED_COLUMNS} makes "counts as coverage" and "is a
 *   ledger row" the same claim.
 *
 * **One reader, two commands.** `qfai validate` scores coverage from every
 * ledger table because `/qfai-implement` appends a table per change request;
 * `qfai report` read only the first, so a `done` row in an appended section
 * validated clean and was printed as `open`. The progress figure a CI job
 * publishes and the gate that blocks it must not disagree about the same file.
 */
export function collectLedgerTables(content: string): LedgerTable[] {
  const tables: LedgerTable[] = [];
  for (const table of parseAllMarkdownTables(maskNonSpecRegions(content))) {
    const headers = table.headers.map((header) => header.trim());
    if (!TDD_LEDGER_REQUIRED_COLUMNS.every((column) => headers.includes(column))) continue;
    // Every index resolves: the check above required all eight columns.
    tables.push({
      table,
      headers,
      tcRefsIndex: headers.indexOf("TC-Refs"),
      layerIndex: headers.indexOf("Layer"),
      tddIdIndex: headers.indexOf("TDD-ID"),
    });
  }
  return tables;
}

/**
 * Layers whose rows cannot host a `TC-*` obligation.
 *
 * `catalog/test-layers.md` forbids `TC-*` annotations in `tests/e2e/**` and
 * `tests/api/**`, so those rows record their obligation in `US-Refs` /
 * `CON-API-Refs`.
 *
 * **One set, two rules.** `tddList.ts` reads it to raise
 * `TDDLIST_OBLIGATION_LAYER_MISMATCH` on a `TC-*` placed there, and
 * {@link isCoverageBearingRow} reads it to decline to count that same
 * placement. A second copy would let the ledger report a row as illegal and
 * still score coverage from it — the exact disagreement this module exists to
 * make impossible.
 *
 * **Membership is lower-case only**, on the same terms as
 * {@link UNIT_COMPONENT_LAYERS}.
 */
/**
 * The ledger `Layer` vocabulary, lower-cased.
 *
 * Shared with `tddList.ts`'s enum check so "is this a legal layer" has one
 * answer: the check that reports a bad value and the predicate that declines
 * to score from it must not disagree about which values are bad.
 */
export const TDD_LEDGER_LAYERS = new Set(["unit", "component", "integration", "api", "e2e"]);

export const TC_FORBIDDEN_LAYERS = new Set(["api", "e2e"]);

/**
 * Whether the line is a ledger row at all.
 *
 * A schema-shaped header is not enough: the row itself has to be an item, and
 * `TDD-ID` is what makes it one. A line that fills `TC-Refs` and leaves
 * `TDD-ID`, `Layer` and `Test file` blank is a note between tables, not an
 * entry — every per-row rule keys on the identity this cell carries
 * (`TDDLIST_DUPLICATE_ID`, the `match.dl_ids` waiver key), and a line without
 * one has nothing for them to key on.
 */
export function isLedgerRow(scan: LedgerTable, row: readonly string[]): boolean {
  return (row[scan.tddIdIndex] ?? "").trim().length > 0;
}

/**
 * Whether a ledger row is one a **coverage claim** may be read from.
 *
 * Strictly narrower than {@link isLedgerRow}: a `TC-*` sitting on an E2E/API
 * row is a forbidden placement, and counting it would let that one illegal row
 * close a coverage-target TC.
 *
 * The two questions are deliberately separate. Answering both with this
 * predicate dropped every parked E2E/API row out of `qfai report`'s
 * `- exception rows:` block while `TDDLIST_EXCEPTION_PARKED` still named it —
 * a roll-call of ledger rows is not a coverage claim, and a report that
 * silently omits a subset of the rows the gate reports is worse than one that
 * omits none. Ask {@link isLedgerRow} for "is this an entry", ask this for
 * "may progress be scored from it".
 *
 * Shared so `qfai validate` and `qfai report` cannot answer either differently.
 */
/**
 * Whether a line is one the per-row rules apply to.
 *
 * Every row of the **first** ledger table is checked, including a malformed one
 * with no `TDD-ID`: that table is the ledger a one-table spec has, its rows
 * have always been reported by position, and dropping a malformed line there
 * would silently stop reporting a defect the gate used to name. Past table 1 a
 * line without an id is a note between tables, not an entry
 * ({@link isLedgerRow}).
 *
 * Shared so `qfai report`'s parked-row roll-call covers exactly the rows
 * `TDDLIST_EXCEPTION_PARKED` names. A report that omits an unapproved
 * `exception` the gate reported is worse than one that omits none.
 */
export function isRowShapeChecked(
  scan: LedgerTable,
  row: readonly string[],
  tableIndex: number,
): boolean {
  return tableIndex === 0 || isLedgerRow(scan, row);
}

/** The `TC-*` shapes a reference may take: `TC-NNNN` or `TC-NNNN-NNNN`. */
const TC_REF_SHAPE = /^TC-\d{4}(-\d{4})?$/;

/**
 * Whether a `TC-Refs` token can discharge anything.
 *
 * `resolveParentTcId` strips the last segment, so an over-long
 * `TC-0001-0001-0001` resolves to the real `TC-0001-0001` and would mark it
 * covered — while the validator's unknown-ref check skips a token of the
 * wrong shape rather than reporting it, so nothing names the typo either. A
 * malformed cell must not discharge the obligation it mistyped, in the gate
 * or in the report.
 */
export function isWellFormedTcRef(ref: string): boolean {
  return TC_REF_SHAPE.test(ref.trim().toUpperCase());
}
export function isCoverageBearingRow(scan: LedgerTable, row: readonly string[]): boolean {
  if (!isLedgerRow(scan, row)) return false;
  const layer = (row[scan.layerIndex] ?? "").trim().toLowerCase();
  // A **blank** `Layer` cannot bear a coverage claim. Every rule that would
  // police the placement keys on this cell and skips when it is empty —
  // Check 5a's enum, the forbidden-layer test just below, the `Level`/`Layer`
  // crosswalk — so a row with an id, a `TC-Refs` and nothing else cleared
  // `TDDLIST_TC_NOT_COVERED` with no test behind it and no rule able to say
  // so.
  //
  // An unknown but *non-empty* layer still counts, deliberately: the row is a
  // ledger row, ledgers written before the enum existed carry
  // project-specific names, and `TDDLIST_UNKNOWN_LAYER` names it at
  // `warning`. An empty cell is not a project's own vocabulary, it is an
  // absent claim — and it is the only value no rule reports at all.
  // `-` too, not only an empty cell: the enum check treats them as the same
  // "no claim" placeholder, so a row can carry `Layer = -` and be exempt from
  // every placement rule while still clearing the coverage obligation.
  if (layer.length === 0 || layer === "-") return false;
  return !TC_FORBIDDEN_LAYERS.has(layer);
}

/**
 * Split a TC-Refs cell value into individual TC reference strings.
 * Accepts comma, semicolon, or whitespace as delimiters.
 */
export function splitTcRefs(cell: string): string[] {
  return cell
    .trim()
    .split(/[,;\s]+/)
    .filter((r) => r.length > 0);
}

/**
 * Resolve the parent TC-ID from a sub-ID reference.
 * Example: "TC-0001-0001" → "TC-0001".
 * Returns `undefined` when the reference is already a parent-level ID
 * (i.e., has only one numeric segment like "TC-0001").
 */
export function resolveParentTcId(tcRef: string): string | undefined {
  // Only strip when there are at least two -NNNN segments (sub-ID)
  if (!/^TC-\d{4}-\d{4}/i.test(tcRef)) return undefined;
  const parent = tcRef.replace(/-\d{4}$/, "");
  return parent !== tcRef ? parent : undefined;
}

/**
 * The declared TC a ledger `TC-Refs` token speaks for, or `undefined` when it
 * speaks for none.
 *
 * A ledger may decompose one declared TC into several rows and cite the parts
 * as `TC-NNNN-NNNN`; only the parent is written in `06_Test-Cases.md`. Every
 * rule that pairs a row with the spec therefore has to answer "which declared
 * TC is this token about" the same way, and they did not: the unknown-reference
 * check resolved the parent while the `Level`-migration check compared the
 * token directly, so a row citing `TC-0001-0001` was accepted as a known
 * reference *and* escaped the migration warning its parent had earned. One
 * resolver, so the two cannot drift again.
 *
 * The token's own declaration wins over its parent's: a spec may declare a
 * sub-ID in its own right, and that row's `Level` is then the one in force.
 * A token of the wrong shape resolves to nothing — `resolveParentTcId` strips
 * the last segment, so an over-long `TC-0001-0001-0001` would otherwise speak
 * for a real `TC-0001-0001` on the strength of a typo.
 */
export function resolveDeclaredTcId(
  ref: string,
  declaredTcIds: ReadonlySet<string>,
): string | undefined {
  const normalized = ref.trim().toUpperCase();
  if (!isWellFormedTcRef(normalized)) return undefined;
  if (declaredTcIds.has(normalized)) return normalized;
  const parent = resolveParentTcId(normalized);
  return parent !== undefined && declaredTcIds.has(parent) ? parent : undefined;
}
