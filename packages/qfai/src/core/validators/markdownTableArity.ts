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
 * reader indexes, so a stray pipe in one of those stays a `warning`.
 *
 * "A reader opens it" is taken literally, in all three of its parts
 * ({@link LedgerReaders}): the reader has to open that *path* — an evacuated
 * `archive/tdd/test-list.md` is opened by nobody — under that entry's *layout*,
 * and then admit that *table*. Deciding severity from the file name alone would
 * let any of the three stop a consuming repo's default `failOn: "error"` gate,
 * and promoting a young rule code to `error` across a whole spec pack is what
 * floods that repo on its first upgrade.
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

/**
 * The traceability ledger `traceabilityIntegrity.ts` opens.
 *
 * It resolves `<specsDir>/<specId>/16_Traceability-ledger.md` from the path of
 * a changed BR/AC file, never from a collected entry, so this reader is the one
 * that does not vary with layout.
 */
const INTEGRITY_LEDGER_FILE_NAME = "16_Traceability-ledger.md";

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

/**
 * Whether the host filesystem resolves a mis-cased path to the same file.
 *
 * NTFS and APFS do, ext4 does not — the same split `specLayout.ts` draws for
 * its case-exact required-file probe. Every ledger reader opens a case-exact
 * path (`path.join(entry.dir, "tdd", "test-list.md")` and friends), so on a
 * case-sensitive filesystem `TDD/test-list.md` is a *different* file that no
 * reader ever opens, and its arity must not stop a gate; on a case-insensitive
 * one it is the very file `validateTddList` reads, and has to keep its `error`.
 */
const CASE_INSENSITIVE_FILESYSTEM = process.platform === "win32" || process.platform === "darwin";

/**
 * Key under which a scanned path and a reader's path are compared.
 *
 * Separator folding is unconditional — `\` and `/` name the same file on the
 * host that produced the path — while case folding follows the filesystem, so
 * a look-alike is only ever conflated with the real ledger where the platform
 * itself conflates them.
 */
function ledgerPathKey(rel: string): string {
  const separatorsFolded = rel.replace(/\\/g, "/");
  return CASE_INSENSITIVE_FILESYSTEM ? separatorsFolded.toLowerCase() : separatorsFolded;
}

/** The header normalization both traceability-ledger readers apply. */
function normalizeLedgerHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Which readers open one file, and therefore what a shifted row there costs.
 *
 * A file name is not a reader: the same `16_Traceability-ledger.md` is walked
 * by different readers — or by none — depending on the layout of the entry it
 * sits in, so severity is decided from the readers a *path* has under a
 * *collected entry*, never from the name.
 */
type LedgerReaders = {
  /** `validateTddList` / `collectLedgerTables` walk this file's ledger tables. */
  tddList: boolean;
  /** `traceabilityIntegrity.ts#readLedgerTable` opens this file. */
  implementationFile: boolean;
  /**
   * `specPackReport.ts#parseLedgerRows` — and, for a spec-pack entry,
   * `specPack.ts#validateTraceabilityLedger` — open this file.
   */
  traceColumns: boolean;
};

const NO_LEDGER_READERS: LedgerReaders = {
  tddList: false,
  implementationFile: false,
  traceColumns: false,
};

function mergeLedgerReaders(left: LedgerReaders, right: LedgerReaders): LedgerReaders {
  return {
    tddList: left.tddList || right.tddList,
    implementationFile: left.implementationFile || right.implementationFile,
    traceColumns: left.traceColumns || right.traceColumns,
  };
}

/**
 * The ledger files one entry's readers open, and which reader opens each.
 *
 * Three readers, three paths — and the layout is read off the entry rather than
 * restated here:
 *
 * - `validateTddList` opens exactly `<entry.dir>/tdd/test-list.md`, under every
 *   layout.
 * - `traceabilityIntegrity` opens `<entry.dir>/16_Traceability-ledger.md`, also
 *   under every layout, because it resolves that name from a changed BR/AC path
 *   instead of from a collected entry.
 * - The nine-column readers open `entry.traceabilityLedgerPath` and nothing
 *   else. `specLayout.ts` already resolves that per layout — the same file for
 *   a spec-pack entry, `traceability-matrix.md` for a layered or legacy one —
 *   so a layered entry's `16_Traceability-ledger.md` collects only the
 *   `implementationFile` reader, and a nine-column table sitting in it is read
 *   by nobody: `validateSpecPacks` calls `validateTraceabilityLedger` in the
 *   `layout === "spec-pack"` branch alone, and `specPackReport` has gone to
 *   `traceability-matrix.md`. Asking the entry rather than the file name is
 *   what keeps this from drifting when a layout moves its ledger.
 */
function ledgerReadersForEntry(entry: Pick<SpecEntry, "dir" | "traceabilityLedgerPath">): Array<{
  path: string;
  readers: LedgerReaders;
}> {
  return [
    {
      path: path.join(entry.dir, "tdd", "test-list.md"),
      readers: { ...NO_LEDGER_READERS, tddList: true },
    },
    {
      path: path.join(entry.dir, INTEGRITY_LEDGER_FILE_NAME),
      readers: { ...NO_LEDGER_READERS, implementationFile: true },
    },
    {
      path: entry.traceabilityLedgerPath,
      readers: { ...NO_LEDGER_READERS, traceColumns: true },
    },
  ];
}

/**
 * Readers per ledger path of the collected spec entries, keyed by
 * {@link ledgerPathKey} of the path relative to `root`.
 *
 * Name alone is not enough. `specsDir/**` is walked whole, so an evacuated copy
 * at `spec-0001/archive/tdd/test-list.md` — or any nested directory carrying a
 * ledger's file name — ends with the same suffix as the real thing while no
 * reader ever opens it. Its rows are read by nobody, so its arity cannot stop a
 * consumer's default `failOn: "error"` gate.
 *
 * Entries are merged rather than overwritten: under the spec-pack layout
 * `traceabilityLedgerPath` *is* `16_Traceability-ledger.md`, and that file is
 * read both ways.
 *
 * Degrading to an empty map is deliberate: with no entries, every mismatch is a
 * `warning`, which is the advisory side of the scoping this validator exists to
 * keep.
 */
async function collectLedgerReaders(
  root: string,
  config: QfaiConfig,
): Promise<Map<string, LedgerReaders>> {
  const specsRoot = resolvePath(root, config, "specsDir");
  let entries: SpecEntry[];
  try {
    entries = await collectSpecEntries(specsRoot);
  } catch {
    return new Map();
  }
  const byPath = new Map<string, LedgerReaders>();
  for (const entry of entries) {
    for (const ledger of ledgerReadersForEntry(entry)) {
      const key = ledgerPathKey(path.relative(root, ledger.path));
      byPath.set(key, mergeLedgerReaders(byPath.get(key) ?? NO_LEDGER_READERS, ledger.readers));
    }
  }
  return byPath;
}

/**
 * Whether a traceability ledger's first table is one of `readers` would walk.
 *
 * The readers do not take every first table: `traceabilityIntegrity.ts` admits
 * one only when it has at least three columns and one of them is
 * `Implementation File`, and `specPackReport.ts#parseLedgerRows` /
 * `specPack.ts#validateTraceabilityLedger` only when it carries all of
 * {@link TRACEABILITY_LEDGER_REQUIRED_COLUMNS}. A table failing the admission
 * of every reader that opens the file is skipped with a `warning` and no row of
 * it is ever resolved by position, so its arity must not be an `error` — a
 * `16_Traceability-ledger.md` opening with a prose table, or holding a
 * nine-column table in a layout whose nine-column readers look elsewhere, would
 * otherwise stop the gate over rows nobody reads.
 */
function isReadTraceabilityLedgerTable(
  readers: LedgerReaders,
  headers: readonly string[],
): boolean {
  const present = headers.filter((cell) => cell.length > 0);
  if (
    readers.implementationFile &&
    present.length >= 3 &&
    present.some((cell) => /Implementation File/i.test(cell))
  ) {
    return true;
  }
  if (!readers.traceColumns) {
    return false;
  }
  const normalized = new Set(present.map(normalizeLedgerHeader));
  return TRACEABILITY_LEDGER_REQUIRED_COLUMNS.every((column) => normalized.has(column));
}

/**
 * Lines of `text` whose mismatching row belongs to a table `readers` walk.
 *
 * Mirrors what the ledger readers admit, so severity follows the same rule as
 * "is this row read positionally?" — and each branch mirrors *its own* reader,
 * because they do not read alike:
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
 *   *unmasked* file, and only if a reader that opens the file would admit its
 *   schema.** `specPack.ts#validateTraceabilityLedger`,
 *   `traceabilityIntegrity.ts#readLedgerTable` and
 *   `specPackReport.ts#parseLedgerRows` all hand the raw content to
 *   `parseFirstMarkdownTable`, so masking here would score a different table
 *   than the one they position-read whenever a fenced example or a
 *   commented-out table precedes the real one. {@link
 *   isReadTraceabilityLedgerTable} then applies their admission condition.
 *
 * Both branches are evaluated, and their lines unioned, rather than chosen
 * between: which branch applies is the readers' business, not this function's.
 */
function positionallyReadMismatchLines(readers: LedgerReaders, text: string): Set<number> {
  const lines = new Set<number>();
  if (readers.tddList) {
    for (const mismatch of findTableArityMismatches(maskNonSpecRegions(text))) {
      if (TDD_LEDGER_REQUIRED_COLUMNS.every((column) => mismatch.headers.includes(column))) {
        lines.add(mismatch.line);
      }
    }
  }
  if (readers.implementationFile || readers.traceColumns) {
    for (const mismatch of findTableArityMismatches(text)) {
      if (mismatch.tableIndex === 0 && isReadTraceabilityLedgerTable(readers, mismatch.headers)) {
        lines.add(mismatch.line);
      }
    }
  }
  return lines;
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

  const ledgerReaders = await collectLedgerReaders(root, config);

  const issues: Issue[] = [];
  for (const file of files.sort()) {
    const text = await readSafe(file);
    if (text.length === 0) {
      continue;
    }
    const rel = path.relative(root, file).replace(/\\/g, "/");
    // Only a collected entry's own ledger path is read positionally, and only
    // by the readers that path has under that entry's layout; a same-named copy
    // in a nested directory is scored as documentation.
    const readers = ledgerReaders.get(ledgerPathKey(rel));
    const positionalLines = readers
      ? positionallyReadMismatchLines(readers, text)
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
