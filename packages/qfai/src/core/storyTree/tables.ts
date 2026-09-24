import { parseAllMarkdownTables } from "../specPackParsers.js";
import { isStoryTreeId } from "./ids.js";

export type RecordTableKind = "decisions" | "open-questions";
export type RecordRow = { id: string; content: string; approach: string; status: string };
export type ParsedRecordTable = { rows: RecordRow[]; errors: string[] };
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
const DECISION_STATUS = /^(?:TODO|WIP|DONE|REJECTED|SUPERSEDED \(by DEC-\d{4}\))$/;
const QUESTION_STATUS = /^(?:TODO|WIP|DONE|DEFERRED)$/;
const ROW_KEYS = ["id", "content", "approach", "status"] as const;

export function parseRecordTable(text: string, kind: RecordTableKind): ParsedRecordTable {
  const tables = parseAllMarkdownTables(text);
  const errors: string[] = [];
  if (tables.length !== 1) {
    errors.push(`${kind} requires exactly one table`);
  }
  const table = tables[0];
  if (!table) return { rows: [], errors };
  if (
    table.headers.length !== HEADERS.length ||
    table.headers.some((header, index) => header !== HEADERS[index])
  ) {
    errors.push(`${kind} requires ID, Content, Approach and Status columns`);
  }
  const rows = table.rows.map((cells) => ({
    id: cells[0] ?? "",
    content: cells[1] ?? "",
    approach: cells[2] ?? "",
    status: cells[3] ?? "",
  }));
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (table.rows[index]?.length !== HEADERS.length) {
      errors.push(`${kind} row ${index + 1} has the wrong number of cells`);
    }
    if (!isStoryTreeId(row.id, kind === "decisions" ? "DEC" : "OQ")) {
      errors.push(`${kind} row ${index + 1} has an invalid ID: ${row.id}`);
    }
    if (seen.has(row.id)) errors.push(`${kind} declares ${row.id} more than once`);
    seen.add(row.id);
    const statusPattern = kind === "decisions" ? DECISION_STATUS : QUESTION_STATUS;
    if (!statusPattern.test(row.status)) {
      errors.push(`${kind} row ${row.id} has an invalid Status: ${row.status}`);
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
        ? row.status === "WIP" || row.status === "DONE"
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
  const baseTable = parseRecordTable(baseText, kind);
  const headTable = parseRecordTable(headText, kind);
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
