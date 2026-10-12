import path from "node:path";

import { parseAllMarkdownTables } from "../specPackParsers.js";
import { isStoryTreeId } from "./ids.js";

export type RecordTableKind = "decisions" | "open-questions";
export type RecordRow = { id: string; content: string; approach: string; status: string };
export type ParsedRecordTable = { rows: RecordRow[]; errors: string[] };
export type DecisionOccurrence = {
  row: RecordRow;
  origin: { path: string; actualRow: number; rawOrdinal: number };
  /** Stored physical row, including its original line ending. */
  raw: string;
};
export type DecisionRegisterError = { file: string; message: string };
export type DecisionRegister = {
  table: ParsedRecordTable;
  files: string[];
  occurrences: DecisionOccurrence[];
  errors: DecisionRegisterError[];
  /** A size finding still reads the complete legacy register. */
  complete: boolean;
};
export type ClassifiedRecordRow = {
  kind: "test-exception" | "change-request" | "unadjudicated" | "other";
  refs: string[];
  inForce: boolean;
  row: RecordRow;
};
export type ChangedRecordCell = {
  id: string;
  cell: keyof RecordRow;
  before: string;
  after: string;
};
export type RecordTableDiff = {
  removed: RecordRow[];
  changed: ChangedRecordCell[];
  rewritten: ChangedRecordCell[];
  appended: RecordRow[];
  onlyChangeRequestRows: boolean;
};

const HEADERS = ["ID", "Content", "Approach", "Status"];
const DECISION_STATUS = /^(?:TODO|WIP|DONE|REJECTED|(?:PARTLY )?SUPERSEDED \(by DEC-\d{4}\))$/;
const PARTLY_SUPERSEDED = /^PARTLY SUPERSEDED \(by DEC-\d{4}\)$/;
const QUESTION_STATUS = /^(?:TODO|WIP|DONE|DEFERRED)$/;
const ROW_KEYS = ["id", "content", "approach", "status"] as const;

/** The optional index is a closed direct-path list; it never follows Markdown links. */
export function decisionPagePaths(text: string): { paths: string[]; errors: string[] } {
  const lines = text.split(/\r?\n/);
  const indexes = lines.flatMap((line, index) => (line === "## Decision pages" ? [index] : []));
  if (indexes.length === 0) return { paths: [], errors: [] };
  const start = indexes[0] ?? -1;
  const finish = lines.indexOf("## Decisions", start + 1);
  const errors: string[] = [];
  if (indexes.length !== 1 || finish < 0) {
    errors.push("Decision pages requires one section before Decisions");
  }
  const paths: string[] = [];
  for (const line of lines.slice(start + 1, finish < 0 ? undefined : finish)) {
    if (line.trim() === "") continue;
    const entry = /^- (decisions\/page-\d{4}\.md)$/.exec(line)?.[1];
    if (!entry) {
      errors.push(`Unsafe or invalid Decision pages entry: ${line}`);
      continue;
    }
    if (paths.includes(entry))
      errors.push(`Duplicate Decision pages entry: ${entry} is listed more than once`);
    paths.push(entry);
  }
  if (paths.length === 0) errors.push("Decision pages requires at least one direct page entry");
  return { paths, errors };
}

/** All listed pages precede the append tail; malformed inventories grant no partial read. */
export function parseDecisionRegister(
  texts: ReadonlyMap<string, string>,
  rootFile: string,
): DecisionRegister {
  const errors: DecisionRegisterError[] = [];
  let complete = true;
  const report = (file: string, message: string, incomplete = true) => {
    errors.push({ file, message });
    if (incomplete) complete = false;
  };
  const rootText = texts.get(rootFile);
  if (rootText === undefined) {
    report(rootFile, "Missing decisions root");
    return { table: { rows: [], errors: [] }, files: [], occurrences: [], errors, complete };
  }
  const directory = path.posix.dirname(rootFile);
  const index = decisionPagePaths(rootText);
  for (const error of index.errors) report(rootFile, error);
  const listed = index.paths.map((file) => path.posix.join(directory, file));
  const pageDirectory = path.posix.join(directory, "decisions");
  for (const file of texts.keys()) {
    if (file.startsWith(`${pageDirectory}/`) && !listed.includes(file)) {
      report(file, "Unlisted decision page or unexpected decision-directory entry");
    }
  }
  const files = [...listed, rootFile];
  const rows: RecordRow[] = [];
  const occurrences: DecisionOccurrence[] = [];
  const tableErrors: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const text = texts.get(file);
    if (text === undefined) {
      report(file, "Missing or unreadable listed decision page");
      continue;
    }
    const physical = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    if (physical.length > 500)
      report(
        file,
        `Decision document has ${physical.length} physical lines; maximum is 500`,
        false,
      );
    const content = text
      .replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\r\n]/g, ""))
      .split(/\r?\n/);
    const headings = content.filter((line) => /^#/.test(line));
    const expected =
      file === rootFile && index.paths.length > 0
        ? ["# Decisions", "## Decision pages", "## Decisions"]
        : ["# Decisions", "## Decisions"];
    if (headings.join("\n") !== expected.join("\n")) {
      report(file, "Decision document requires the closed Decisions headings in order");
    }
    let inList = false;
    for (const line of content) {
      if (line === "## Decision pages") {
        inList = true;
        continue;
      }
      if (line === "## Decisions") {
        inList = false;
        continue;
      }
      if (line.trim() === "" || line === "# Decisions") continue;
      if (inList && file === rootFile && /^- decisions\/page-\d{4}\.md$/.test(line)) continue;
      if (!inList && line.startsWith("|")) continue;
      report(file, "Unexpected content in the closed decision document");
    }
    const table = parseRecordTable(text, "decisions");
    const stored = physical.flatMap((raw, index) =>
      /^\|\s*DEC-/.test(raw) ? [{ raw, actualRow: index + 1 }] : [],
    );
    for (const error of table.errors) {
      const numbered = /^decisions row (\d+) has/.exec(error)?.[1];
      const named = /^decisions row (DEC-[^ ]+) has/.exec(error)?.[1];
      const rowIndex = numbered
        ? Number(numbered) - 1
        : table.rows.findIndex((row) => row.id === named);
      const actualRow = stored[rowIndex]?.actualRow;
      tableErrors.push(`${file}${actualRow === undefined ? "" : `:${actualRow}`}: ${error}`);
    }
    if (stored.length !== table.rows.length)
      report(file, "Decision rows cannot be mapped to their physical origins");
    for (const [index, row] of table.rows.entries()) {
      const origin = stored[index];
      if (!origin) continue;
      if (seen.has(row.id))
        tableErrors.push(
          `${file}: decisions declares ${row.id} more than once in the logical register`,
        );
      seen.add(row.id);
      rows.push(row);
      occurrences.push({
        row,
        origin: { path: file, actualRow: origin.actualRow, rawOrdinal: occurrences.length + 1 },
        raw: origin.raw,
      });
    }
  }
  return {
    table: { rows: complete ? rows : [], errors: tableErrors },
    files,
    occurrences: complete ? occurrences : [],
    errors,
    complete,
  };
}

function statusPreview(status: string): string {
  const characters = Array.from(status.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").trim());
  return characters.slice(0, 40).join("") + (characters.length > 40 ? "..." : "");
}

export function parseRecordTable(text: string, kind: RecordTableKind): ParsedRecordTable {
  const tables = parseAllMarkdownTables(text);
  const errors: string[] = [];
  if (tables.length !== 1) {
    errors.push(`${kind} requires exactly one table`);
  }
  const table = tables[0];
  if (!table) return { rows: [], errors };
  const unexpected = table.headers.filter((header) => !HEADERS.includes(header));
  const missing = HEADERS.filter((header) => !table.headers.includes(header));
  for (const header of unexpected) errors.push(`${kind} has the unexpected column ${header}`);
  for (const header of missing) errors.push(`${kind} is missing the column ${header}`);
  if (
    unexpected.length === 0 &&
    missing.length === 0 &&
    table.headers.some((header, index) => header !== HEADERS[index])
  ) {
    errors.push(`${kind} columns must be ID, Content, Approach and Status, in that order`);
  }
  const rows = table.rows.map((cells) => ({
    id: cells[0] ?? "",
    content: cells[1] ?? "",
    approach: cells[2] ?? "",
    status: cells[3] ?? "",
  }));
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const actualCellCount = table.rows[index]?.length;
    if (actualCellCount !== HEADERS.length) {
      errors.push(
        `${kind} row ${index + 1} has the wrong number of cells: expected ${HEADERS.length}, actual ${actualCellCount}`,
      );
    }
    if (!isStoryTreeId(row.id, kind === "decisions" ? "DEC" : "OQ")) {
      errors.push(`${kind} row ${index + 1} has an invalid ID: ${row.id}`);
    }
    if (seen.has(row.id)) errors.push(`${kind} declares ${row.id} more than once`);
    seen.add(row.id);
    const statusPattern = kind === "decisions" ? DECISION_STATUS : QUESTION_STATUS;
    if (!statusPattern.test(row.status)) {
      const allowedStatuses =
        kind === "decisions"
          ? "TODO, WIP, DONE, REJECTED, SUPERSEDED (by DEC-NNNN), PARTLY SUPERSEDED (by DEC-NNNN)"
          : "TODO, WIP, DONE, DEFERRED";
      errors.push(
        `${kind} row ${row.id} has an invalid Status: "${statusPreview(row.status)}"; allowed: ${allowedStatuses}`,
      );
    }
  }
  return { rows, errors };
}

export function classifyRecordRow(row: RecordRow): ClassifiedRecordRow {
  const match = /^(Test exception|Change request|Unadjudicated):\s*(.*)$/i.exec(row.content);
  const keyword = match?.[1]?.toLowerCase();
  const kind =
    keyword === "test exception"
      ? "test-exception"
      : keyword === "change request"
        ? "change-request"
        : keyword === "unadjudicated"
          ? "unadjudicated"
          : "other";
  const refs =
    kind === "unadjudicated" || kind === "other"
      ? []
      : (match?.[2] ?? "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
  const inForce =
    kind === "test-exception"
      ? row.status === "DONE"
      : kind === "change-request"
        ? row.status === "WIP" || row.status === "DONE" || PARTLY_SUPERSEDED.test(row.status)
        : kind === "unadjudicated"
          ? row.status === "TODO" || row.status === "WIP"
          : false;
  return { kind, refs, inForce, row };
}

export function diffRecordTables(
  baseText: string,
  headText: string,
  kind: RecordTableKind,
): RecordTableDiff {
  return diffRecordRows(parseRecordTable(baseText, kind), parseRecordTable(headText, kind), kind);
}

/** Compares physical occurrences in logical register order, retaining duplicate copies. */
export function diffRecordRows(
  baseTable: ParsedRecordTable,
  headTable: ParsedRecordTable,
  kind: RecordTableKind,
): RecordTableDiff {
  const base = baseTable.rows;
  const head = headTable.rows;
  const removed: RecordRow[] = [];
  const changed: ChangedRecordCell[] = [];
  const rewritten: ChangedRecordCell[] = [];
  for (const [index, before] of base.entries()) {
    const after = head[index];
    if (!after) {
      removed.push(before);
      continue;
    }
    for (const cell of ROW_KEYS) {
      if (before[cell] === after[cell]) continue;
      const difference = { id: before.id, cell, before: before[cell], after: after[cell] };
      changed.push(difference);
      if (cell !== "status") rewritten.push(difference);
    }
  }
  const appended = head.slice(base.length);
  return {
    removed,
    changed,
    rewritten,
    appended,
    onlyChangeRequestRows:
      kind === "decisions" &&
      baseTable.errors.length === 0 &&
      headTable.errors.length === 0 &&
      removed.length === 0 &&
      rewritten.length === 0 &&
      changed.every((difference) =>
        head.some(
          (row) => row.id === difference.id && classifyRecordRow(row).kind === "change-request",
        ),
      ) &&
      appended.every((row) => classifyRecordRow(row).kind === "change-request"),
  };
}
