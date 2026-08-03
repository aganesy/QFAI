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
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { isTableSeparator, looksLikeTableRow, splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/** Waivable as `QFAI-TABLE-001`; `TABLE-001` also resolves (`waivers.ts#resolveRuleKeys`). */
export const TABLE_ARITY_RULE_ID = "QFAI-TABLE-001";

export type TableArityMismatch = {
  /** 1-based line of the offending data row. */
  line: number;
  /** First header cell, so the reader can find the table in a long file. */
  tableLabel: string;
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

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) {
      continue;
    }

    const headers = splitMarkdownRow(headerLine);
    const tableLabel = headers[0] ?? "";
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

  const issues: Issue[] = [];
  for (const file of files.sort()) {
    const text = await readSafe(file);
    if (text.length === 0) {
      continue;
    }
    const rel = path.relative(root, file).replace(/\\/g, "/");
    for (const mismatch of findTableArityMismatches(text)) {
      const direction =
        mismatch.rowCount > mismatch.headerCount
          ? `${mismatch.rowCount - mismatch.headerCount} cell(s) are discarded`
          : `the trailing ${mismatch.headerCount - mismatch.rowCount} column(s) read as empty`;
      const finding = issue(
        TABLE_ARITY_RULE_ID,
        `Markdown table row arity mismatch at ${rel}:${mismatch.line} — header declares ` +
          `${mismatch.headerCount} column(s), row has ${mismatch.rowCount} (table "${mismatch.tableLabel}"). ` +
          `Read positionally, ${direction}.`,
        "warning",
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
