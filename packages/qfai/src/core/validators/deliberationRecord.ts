import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const CODE = "QFAI-DELIB-001";
const RULE = "deliberationRecord.layout";
const SECTIONS = ["Interview", "Agent decisions"] as const;
const DELIBERATION_COLUMNS = [
  "Background",
  "Option 1",
  "Option 2",
  "Option 3",
  "Option 4 (other)",
  "Chosen option number",
] as const;

const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const DELIMITER_CELL_RE = /^:?-+:?$/;

type Line = { text: string; number: number };
type Section = { name: string; lines: Line[] };

/**
 * The layout check of the deliberation records: every `*.md` file directly
 * under `paths.deliberationDir`. It reads headings and table shapes only, never
 * the file name or a cell's content, so a record stays a memo the run writes in
 * its own words.
 */
export async function validateDeliberationRecords(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const dir = path.resolve(root, config.paths.deliberationDir);
  let names: string[];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    names = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isEnoent(error)) return [];
    throw error;
  }
  const issues: Issue[] = [];
  for (const name of names) {
    const absolute = path.join(dir, name);
    const file = path.relative(root, absolute).split(path.sep).join("/");
    const text = await readFile(absolute, "utf-8");
    issues.push(...checkRecord(file, text));
  }
  return issues;
}

function checkRecord(file: string, text: string): Issue[] {
  const sections = collectSections(text);
  const issues: Issue[] = [];
  for (const name of SECTIONS) {
    if (!sections.some((section) => section.name === name)) {
      issues.push(defect(file, `${file} has no \`${name}\` section.`));
    }
  }
  for (const section of sections) {
    for (const table of collectTables(section.lines)) {
      issues.push(...checkTable(file, section.name, table));
    }
  }
  return issues;
}

/** The lines under each Interview or Agent decisions heading, up to the next heading of its level or above. */
function collectSections(text: string): Section[] {
  const sections: Section[] = [];
  let open: { section: Section; level: number } | null = null;
  let fence: string | null = null;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = { text: raw, number: index + 1 };
    const fenceMatch = FENCE_RE.exec(raw);
    if (fence !== null) {
      if (fenceMatch?.[1]?.startsWith(fence)) fence = null;
      return;
    }
    if (fenceMatch?.[1]) {
      fence = fenceMatch[1];
      return;
    }
    const heading = HEADING_RE.exec(raw);
    if (heading?.[1] && heading[2] !== undefined) {
      const level = heading[1].length;
      if (open !== null && level <= open.level) open = null;
      const name = SECTIONS.find((candidate) => candidate === heading[2]?.trim());
      if (name !== undefined) {
        const section: Section = { name, lines: [] };
        sections.push(section);
        open = { section, level };
      }
      return;
    }
    open?.section.lines.push(line);
  });
  return sections;
}

type Table = { header: string[]; rows: { cells: string[]; number: number }[] };

/** Each table: a row line followed by a delimiter row, then its row lines up to the first other line. */
function collectTables(lines: Line[]): Table[] {
  const tables: Table[] = [];
  for (let index = 0; index + 1 < lines.length; index += 1) {
    const head = lines[index];
    const delimiter = lines[index + 1];
    if (!head || !delimiter || !isRowLine(head.text) || !isDelimiter(delimiter.text)) continue;
    const table: Table = { header: splitCells(head.text), rows: [] };
    let next = index + 2;
    for (; next < lines.length; next += 1) {
      const row = lines[next];
      if (!row || !isRowLine(row.text)) break;
      table.rows.push({ cells: splitCells(row.text), number: row.number });
    }
    tables.push(table);
    index = next - 1;
  }
  return tables;
}

function checkTable(file: string, section: string, table: Table): Issue[] {
  const headerDefect = describeHeaderDefect(table.header);
  const headerIssues =
    headerDefect === null
      ? []
      : [defect(file, `${file}: the \`${section}\` table header ${headerDefect}.`)];
  const rowIssues = table.rows
    .filter((row) => row.cells.length !== DELIBERATION_COLUMNS.length)
    .map((row) =>
      defect(
        file,
        `${file}: the \`${section}\` table row at line ${row.number} has ${row.cells.length} cells; it needs ${DELIBERATION_COLUMNS.length}.`,
      ),
    );
  return [...headerIssues, ...rowIssues];
}

function describeHeaderDefect(header: string[]): string | null {
  const expected: readonly string[] = DELIBERATION_COLUMNS;
  const missing = expected.find((column) => !header.includes(column));
  const extra = header.find((column) => !expected.includes(column));
  if (missing !== undefined && extra !== undefined) {
    return `names a column \`${extra}\` where \`${missing}\` belongs`;
  }
  if (missing !== undefined) return `lacks the column \`${missing}\``;
  if (extra !== undefined) return `adds the column \`${extra}\``;
  const at = expected.findIndex((column, index) => header[index] !== column);
  if (at === -1 && header.length === expected.length) return null;
  if (at === -1) return `repeats the column \`${header[expected.length] ?? ""}\``;
  return `puts the column \`${header[at] ?? ""}\` where \`${expected[at] ?? ""}\` belongs`;
}

function isRowLine(text: string): boolean {
  return text.includes("|") && text.trim().length > 0;
}

function isDelimiter(text: string): boolean {
  if (!text.includes("-")) return false;
  const cells = splitCells(text);
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL_RE.test(cell));
}

/** The cells of a table row; a `\|` is part of a cell, and the outer pipes are optional. */
function splitCells(text: string): string[] {
  let body = text.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

/** Its fix text is the `QFAI-DELIB-001` entry of the validate fix catalogue. */
function defect(file: string, message: string): Issue {
  return issue(CODE, message, "error", file, RULE);
}
