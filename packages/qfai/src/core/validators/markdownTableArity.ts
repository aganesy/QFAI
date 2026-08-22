/**
 * Markdown table header/row arity (QFAI-TABLE-001).
 *
 * `parseAllMarkdownTables` builds `headers` and `rows` independently and never
 * compares them, and every consumer resolves a column with
 * `headers.indexOf(name)` and reads `row[index] ?? ""`. So a row with fewer
 * cells than its header silently yields empty strings for the tail columns, and
 * a row with more cells silently discards the surplus — or shifts every column
 * after the offending pipe.
 *
 * The padding is what makes it invisible. Several `tddList` checks then
 * `continue` on an empty value, which is correct for a genuinely empty cell and
 * excuses truncation for free: a row truncated before `Status` yields `""`, and
 * the status enum check passes on a row that has no status at all.
 *
 * This validator scans the spec pack for the mismatch itself. It is the one
 * place the two counts are compared, so a project no longer has to restate
 * "keep every row at exactly N columns" per work order and verify it by hand.
 *
 * Severity is scoped rather than blanket, and scoped per *table* rather than
 * per file. A mismatch is `error` only where a downstream validator resolves
 * that very table by column position — the ledger table of `tdd/test-list.md`
 * and the ledger table of the traceability ledger — because only there does a
 * shifted row change what a validator sees. Every other table in the spec pack,
 * the ledger files included, is prose a human reads: the shipped
 * `tdd/test-list.md` carries a `## Schema` table and fenced examples that no
 * reader indexes, so a stray pipe in one of those stays a `warning`. The path
 * is scoped the same way: only a collected `SpecEntry`'s own ledger path
 * counts, so an evacuated `archive/tdd/test-list.md` no reader opens stays a
 * `warning` too. Deciding severity from the file name alone would let such a
 * table stop a consuming repo's default `failOn: "error"` gate, and promoting a
 * young rule code to `error` across a whole spec pack is what floods that repo
 * on its first upgrade.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import {
  isTableSeparator,
  looksLikeTableRow,
  maskNonSpecRegions,
  splitMarkdownRow,
} from "../specPackParsers.js";
import { TDD_LEDGER_REQUIRED_COLUMNS } from "../tddHelpers.js";
import type { Issue, IssueSeverity } from "../types.js";
import { issue, readSafe } from "./utils.js";

/** Waivable as `QFAI-TABLE-001`; `TABLE-001` also resolves (`waivers.ts#resolveRuleKeys`). */
export const TABLE_ARITY_RULE_ID = "QFAI-TABLE-001";

const TDD_TEST_LIST_SUFFIX = "/tdd/test-list.md";

/** The traceability ledger under the spec-pack layout, and under layered as well. */
const LAYERED_TRACEABILITY_LEDGER_SUFFIX = "/16_traceability-ledger.md";
/** The traceability ledger `traceabilityLedgerPath` names for a layered or legacy entry. */
const LEGACY_TRACEABILITY_LEDGER_SUFFIX = "/traceability-matrix.md";

/** The traceability ledger's name under the spec-pack, layered and legacy layouts. */
const TRACEABILITY_LEDGER_SUFFIXES = [
  LAYERED_TRACEABILITY_LEDGER_SUFFIX,
  LEGACY_TRACEABILITY_LEDGER_SUFFIX,
];

/**
 * The nine columns `specPackReport.ts#parseLedgerRows` and
 * `specPack.ts#validateTraceabilityLedger` both require before they read a
 * traceability ledger's rows. Restated rather than imported: both readers keep
 * a private copy, and this one exists to answer "would a reader walk this
 * table?", not to define the schema.
 */
const TRACEABILITY_LEDGER_REQUIRED_COLUMNS = [
  "trace_id",
  "obj_id",
  "init_id",
  "cap_id",
  "flow_id",
  "us_id",
  "ac_id",
  "ex_ids",
  "tc_ids",
] as const;

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").toLowerCase();
}

/** The header normalization both traceability-ledger readers apply. */
function normalizeLedgerHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Files that *hold* a table downstream validators read by column position.
 *
 * `tddList` resolves `Status` / `TC-Refs` with `headers.indexOf(name)` and the
 * traceability ledger is walked the same way, so a shifted row in one of those
 * tables changes what a validator sees rather than only how the table renders.
 *
 * Necessary but not sufficient in two directions: the name has to sit at a
 * collected spec entry's own ledger path ({@link collectLedgerRelPaths}), and
 * these files also hold documentation tables that nothing indexes
 * ({@link positionallyReadMismatchLines}).
 */
export function isLedgerPath(rel: string): boolean {
  const normalized = normalizeRel(rel);
  return (
    normalized.endsWith(TDD_TEST_LIST_SUFFIX) ||
    TRACEABILITY_LEDGER_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

/** The ledger files an entry's readers actually open, as absolute paths. */
function ledgerPathsForEntry(entry: SpecEntry): string[] {
  return [
    // `validateTddList` opens exactly `<entry.dir>/tdd/test-list.md`.
    path.join(entry.dir, "tdd", "test-list.md"),
    // `traceabilityIntegrity` opens `<specDir>/16_Traceability-ledger.md`
    // whatever the layout, while `specPackReport` opens the entry's own
    // `traceabilityLedgerPath` — that same file for a spec-pack entry and
    // `traceability-matrix.md` for a layered or legacy one.
    path.join(entry.dir, "16_Traceability-ledger.md"),
    entry.traceabilityLedgerPath,
  ];
}

/**
 * Ledger paths of the collected spec entries, relative to `root` and normalized.
 *
 * Name alone is not enough. `specsDir/**` is walked whole, so an evacuated copy
 * at `spec-0001/archive/tdd/test-list.md` — or any nested directory carrying a
 * ledger's file name — ends with the same suffix as the real thing while no
 * reader ever opens it. Its rows are read by nobody, so its arity cannot stop a
 * consumer's default `failOn: "error"` gate.
 *
 * Degrading to an empty set is deliberate: with no entries, every mismatch is a
 * `warning`, which is the advisory side of the scoping this validator exists to
 * keep.
 */
async function collectLedgerRelPaths(root: string, config: QfaiConfig): Promise<Set<string>> {
  const specsRoot = resolvePath(root, config, "specsDir");
  let entries: SpecEntry[];
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch {
    return new Set();
  }
  const rels = new Set<string>();
  for (const entry of entries) {
    for (const ledger of ledgerPathsForEntry(entry)) {
      rels.add(normalizeRel(path.relative(root, ledger)));
    }
  }
  return rels;
}

/**
 * Whether a traceability ledger's first table is one a reader would walk.
 *
 * The readers do not take every first table: `traceabilityIntegrity.ts` admits
 * one only when it has at least three columns and one of them is
 * `Implementation File`, and `specPackReport.ts#parseLedgerRows` /
 * `specPack.ts#validateTraceabilityLedger` only when it carries all of
 * {@link TRACEABILITY_LEDGER_REQUIRED_COLUMNS}. A table failing both is skipped
 * with a `warning` and no row of it is ever resolved by position, so its arity
 * must not be an `error` — a `16_Traceability-ledger.md` opening with a prose
 * table would otherwise stop the gate over rows nobody reads.
 *
 * `Implementation File` counts only for `16_Traceability-ledger.md`:
 * `traceabilityIntegrity.ts` opens that name alone.
 */
function isReadTraceabilityLedgerTable(normalizedRel: string, headers: readonly string[]): boolean {
  const present = headers.filter((cell) => cell.length > 0);
  const readsByImplementationFile =
    normalizedRel.endsWith(LAYERED_TRACEABILITY_LEDGER_SUFFIX) &&
    present.length >= 3 &&
    present.some((cell) => /Implementation File/i.test(cell));
  if (readsByImplementationFile) {
    return true;
  }
  const normalized = new Set(present.map(normalizeLedgerHeader));
  return TRACEABILITY_LEDGER_REQUIRED_COLUMNS.every((column) => normalized.has(column));
}

/**
 * Lines of `text` whose mismatching row belongs to the ledger table itself.
 *
 * Mirrors what the ledger readers admit, so severity follows the same rule as
 * "is this row read positionally?" — and each branch mirrors *its own* reader,
 * because the two do not read alike:
 *
 * - **In `tdd/test-list.md`, non-spec regions are masked and the table must
 *   carry the ledger schema.** `collectLedgerTables` and `validateTddList` both
 *   read `maskNonSpecRegions(content)`, so a fenced template or a commented-out
 *   old table is not the ledger and its arity is nobody's correctness problem.
 *   Masking blanks lines in place, so the line numbers still address the
 *   original file. `collectLedgerTables` then admits a table only when it holds
 *   all of {@link TDD_LEDGER_REQUIRED_COLUMNS} — which is exactly what keeps
 *   the template's own `## Schema` table (`Column | Description`) out — and
 *   every table it admits is scored, not only the first.
 * - **In the traceability ledger, the ledger is the first table of the
 *   *unmasked* file, and only if a reader would admit its schema.**
 *   `specPack.ts#validateTraceabilityLedger`,
 *   `traceabilityIntegrity.ts#readLedgerTable` and
 *   `specPackReport.ts#parseLedgerRows` all hand the raw content to
 *   `parseFirstMarkdownTable`, so masking here would score a different table
 *   than the one they position-read whenever a fenced example or a
 *   commented-out table precedes the real one. {@link
 *   isReadTraceabilityLedgerTable} then applies their admission condition.
 */
export function positionallyReadMismatchLines(rel: string, text: string): Set<number> {
  const normalized = normalizeRel(rel);
  if (!isLedgerPath(normalized)) {
    return new Set();
  }
  const ledgerRows = normalized.endsWith(TDD_TEST_LIST_SUFFIX)
    ? findTableArityMismatches(maskNonSpecRegions(text)).filter((mismatch) =>
        TDD_LEDGER_REQUIRED_COLUMNS.every((column) => mismatch.headers.includes(column)),
      )
    : findTableArityMismatches(text).filter(
        (mismatch) =>
          mismatch.tableIndex === 0 && isReadTraceabilityLedgerTable(normalized, mismatch.headers),
      );
  return new Set(ledgerRows.map((mismatch) => mismatch.line));
}

export type TableArityMismatch = {
  /** 1-based line of the offending data row. */
  line: number;
  /** First header cell, so the reader can find the table in a long file. */
  tableLabel: string;
  /** Trimmed header cells of the table the row sits in, so its schema is testable. */
  headers: readonly string[];
  /** 0-based position of that table in the text, so a "first table" reader is expressible. */
  tableIndex: number;
  headerCount: number;
  rowCount: number;
};

/**
 * Every data row whose cell count differs from its own header row's.
 *
 * Line-aware on purpose: `parseAllMarkdownTables` discards positions, and a
 * finding that cannot name the row is not actionable in a file with forty
 * tables.
 */
export function findTableArityMismatches(text: string): TableArityMismatch[] {
  const lines = text.split(/\r?\n/);
  const mismatches: TableArityMismatch[] = [];
  let tableIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownRow(headerLine);
    const tableLabel = headers[0] ?? "";
    tableIndex += 1;
    let cursor = index + 2;
    for (; cursor < lines.length; cursor += 1) {
      const rowLine = lines[cursor] ?? "";
      if (!looksLikeTableRow(rowLine)) {
        break;
      }
      const cells = splitMarkdownRow(rowLine);
      if (cells.length !== headers.length) {
        mismatches.push({
          line: cursor + 1,
          tableLabel,
          headers,
          tableIndex,
          headerCount: headers.length,
          rowCount: cells.length,
        });
      }
    }
    // Resume after the table; the rows just walked cannot start another one.
    index = cursor - 1;
  }

  return mismatches;
}

export async function validateMarkdownTableArity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRel = config.paths.specsDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const { files } = await collectFilesByGlobs(root, {
    globs: [`${specsRel}/**/*.md`],
    ignore: [],
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });

  const ledgerRelPaths = await collectLedgerRelPaths(root, config);

  const issues: Issue[] = [];
  for (const file of files.sort()) {
    const text = await readSafe(file);
    if (text.length === 0) {
      continue;
    }
    const rel = path.relative(root, file).replace(/\\/g, "/");
    // Only a collected entry's own ledger path is read positionally; a
    // same-named copy in a nested directory is scored as documentation.
    const positionalLines = ledgerRelPaths.has(normalizeRel(rel))
      ? positionallyReadMismatchLines(rel, text)
      : new Set<number>();
    for (const mismatch of findTableArityMismatches(text)) {
      const severity: IssueSeverity = positionalLines.has(mismatch.line) ? "error" : "warning";
      const direction =
        mismatch.rowCount > mismatch.headerCount
          ? `${mismatch.rowCount - mismatch.headerCount} cell(s) are discarded`
          : `the trailing ${mismatch.headerCount - mismatch.rowCount} column(s) read as empty`;
      const finding = issue(
        TABLE_ARITY_RULE_ID,
        `Markdown table row arity mismatch at ${rel}:${mismatch.line} — header declares ` +
          `${mismatch.headerCount} column(s), row has ${mismatch.rowCount} (table "${mismatch.tableLabel}"). ` +
          `Read positionally, ${direction}.`,
        severity,
        rel,
        "specPack.tableArity",
        undefined,
        "canonical",
        "Make the row's cell count match its header. A stray `|` inside a cell must be escaped " +
          "(`\\|`) or the cell moved out of the table — an unescaped one shifts every column after " +
          "it, so the columns a validator reads are not the ones the author wrote.",
      );
      finding.loc = { line: mismatch.line };
      issues.push(finding);
    }
  }

  return issues;
}
