import {
  isTableSeparator,
  looksLikeTableRow,
  splitMarkdownRow,
} from "../../src/core/specPackParsers.js";

export type TableArityMismatch = {
  /** 1-based line of the offending data row. */
  line: number;
  /** First header cell, for locating the table in a longer file. */
  tableLabel: string;
  /** Trimmed header cells of the table the row sits in. */
  headers: readonly string[];
  /** 0-based position of that table in the text. */
  tableIndex: number;
  headerCount: number;
  rowCount: number;
};

/** Find data rows whose cell count differs from their table header. */
export function findTableArityMismatches(text: string): TableArityMismatch[] {
  const lines = text.split(/\r?\n/);
  const mismatches: TableArityMismatch[] = [];
  let tableIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) continue;

    const headers = splitMarkdownRow(headerLine);
    tableIndex += 1;
    let cursor = index + 2;
    for (; cursor < lines.length; cursor += 1) {
      const rowLine = lines[cursor] ?? "";
      if (!looksLikeTableRow(rowLine)) break;
      const cells = splitMarkdownRow(rowLine);
      if (cells.length !== headers.length) {
        mismatches.push({
          line: cursor + 1,
          tableLabel: headers[0] ?? "",
          headers,
          tableIndex,
          headerCount: headers.length,
          rowCount: cells.length,
        });
      }
    }
    index = cursor - 1;
  }

  return mismatches;
}
