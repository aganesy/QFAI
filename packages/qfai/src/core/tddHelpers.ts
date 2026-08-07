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
 */
export function classifyCoverageLevel(level: string): LevelClassification {
  const normalized = level.trim().toLowerCase();
  if (normalized.length === 0) return "coverage-target";
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
export function isCoverageBearingRow(scan: LedgerTable, row: readonly string[]): boolean {
  if (!isLedgerRow(scan, row)) return false;
  return !TC_FORBIDDEN_LAYERS.has((row[scan.layerIndex] ?? "").trim().toLowerCase());
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
