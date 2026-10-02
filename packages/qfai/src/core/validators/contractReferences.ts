import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { headingText } from "../parse/markdown.js";
import { looksLikeTableRow, maskNonSpecRegions, splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";
import { CONTRACT_KIND_BY_DIR, contractNumber } from "../storyTree/ids.js";
import type { StoryTreeModel } from "../storyTree/tree.js";
import {
  CONTRACT_KIND_DIRS,
  directoryOutsideContractKinds,
  markdownOutsideContractForm,
  NON_MARKDOWN_CONTRACT_FORMS,
  resolveStoryTreeRoots,
} from "../storyTree/layout.js";

const CELL_DECORATION_RE = /^[`*_]+|[`*_]+$/g;

type IndexTableRow = { cells: string[]; line: number };
type IndexTable = { headers: string[]; rows: IndexTableRow[]; line: number; heading: string };

/** Checks the story-tree contract index, including the Markdown CLI contracts. */
export async function validateStoryTreeContractReferences(
  root: string,
  config: QfaiConfig,
  model: StoryTreeModel,
): Promise<Issue[]> {
  const { contractsDir } = resolveStoryTreeRoots(root, config);
  const indexFile = path.join(contractsDir, "contracts.md");
  const tables = parseIndexTables(await readSafe(indexFile));
  const currentTables = tables.filter(
    (table) => table.headers.map(normalizeHeaderKey).join("|") === INDEX_COLUMNS,
  );
  const underIndex = currentTables.filter(
    (table) => table.heading.toLowerCase() === "contract index",
  );
  const current = underIndex.length > 0 ? underIndex : currentTables.slice(0, 1);
  const rows = current.flatMap((table) => table.rows);
  return validateContractIndex({ root, contractsDir, indexFile }, rows, model);
}

/** The current index columns, as {@link normalizeHeaderKey} spells them. */
const INDEX_COLUMNS = "id|title|file|dependson|reconciledwith|purpose";

type IndexLocation = { root: string; contractsDir: string; indexFile: string };
type ListedContract = { id: string; file: string };

function indexIssue(message: string, file: string, refs: string[]): Issue {
  return issue("QFAI-CONTRACT-034", message, "error", file, "contracts.storyTreeIndex", refs);
}

/** The contract kind of a path under the contracts directory, or `null` outside a kind directory. */
function contractKind(relative: string): string | null {
  const [directory, ...rest] = relative.split("/");
  if (rest.length === 0) return null;
  return Object.entries(CONTRACT_KIND_BY_DIR).find(([name]) => name === directory)?.[1] ?? null;
}

/**
 * Checks the index in its current columns. Each contract file under a kind
 * directory declares an ID of that kind, is named `<kind>-NNNN-<slug>.<ext>`
 * after it, and has a row whose ID and File agree with it. A number belongs to
 * one contract, and every row names a contract file. A Markdown file under
 * `api/`, `db/` or `ui/`, and a file in any other directory, is not a
 * contract, and is reported as that alone.
 */
function validateContractIndex(
  location: IndexLocation,
  rows: IndexTableRow[],
  model: StoryTreeModel,
): Issue[] {
  const listed: ListedContract[] = rows.map((row) => ({
    id: bareCell(row.cells[0] ?? ""),
    file: toPosixPath(bareCell(row.cells[2] ?? "")).replace(/^\.\//, ""),
  }));
  const declared = new Map(model.contracts.map(({ id, file }) => [file, id]));
  const matched = new Set<ListedContract>();
  const issues: Issue[] = [];
  for (const file of model.contractFiles) {
    const relative = toPosixPath(path.relative(location.contractsDir, file));
    const outside = directoryOutsideContractKinds(relative);
    const kind = contractKind(relative);
    if (!outside && !kind) continue;
    const spellings = [
      relative,
      toPosixPath(path.relative(location.root, file)),
      toPosixPath(file),
    ];
    // Matched before any report, so a listed file that is not a contract is reported once.
    const row = listed.find((entry) => spellings.includes(entry.file));
    if (row) matched.add(row);
    if (outside) {
      const kinds = CONTRACT_KIND_DIRS.map((kind) => `${kind}/`).join(", ");
      issues.push(
        indexIssue(
          `${file} is under ${outside}/, which is not a contract kind: contracts live in ${kinds}`,
          file,
          [file],
        ),
      );
      continue;
    }
    if (!kind) continue;
    const directory = markdownOutsideContractForm(relative);
    if (directory) {
      issues.push(
        indexIssue(
          `${file} is Markdown, which is not a contract: ${directory}/ holds ${NON_MARKDOWN_CONTRACT_FORMS[directory]} contracts`,
          file,
          [file],
        ),
      );
      continue;
    }
    const id = declared.get(file) ?? null;
    const problems = contractFileProblems(relative, kind, id, row, location.indexFile);
    if (problems.length > 0) {
      issues.push(
        indexIssue(`Contract file ${file} ${problems.join(", and ")}`, file, [id ?? file]),
      );
    }
  }
  for (const row of listed.filter((entry) => !matched.has(entry))) {
    issues.push(
      indexIssue(
        `${location.indexFile} lists ${row.id || "(empty)"} with ${row.file || "(empty)"}, which is not a contract file`,
        location.indexFile,
        [row.id],
      ),
    );
  }
  issues.push(...duplicateContractNumbers(model));
  return issues;
}

function contractFileProblems(
  relative: string,
  kind: string,
  id: string | null,
  row: ListedContract | undefined,
  indexFile: string,
): string[] {
  const problems: string[] = [];
  if (!id) problems.push("declares no contract ID");
  else if (!id.startsWith(`${kind}-`)) problems.push(`declares ${id}, whose kind is not ${kind}`);
  const prefix = `${kind.toLowerCase()}-${(id && contractNumber(id)) ?? String.raw`\d{4}`}-`;
  if (
    !new RegExp(String.raw`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)+$`).test(
      path.posix.basename(relative),
    )
  ) {
    problems.push(`is not named ${kind.toLowerCase()}-NNNN-<slug> after its contract ID`);
  }
  if (!row) problems.push(`has no row in ${indexFile}`);
  else if (row.id !== (id ?? "")) problems.push(`is listed as ${row.id || "(empty)"}`);
  return problems;
}

/** Contract numbers are unique across kinds. */
function duplicateContractNumbers(model: StoryTreeModel): Issue[] {
  const byNumber = new Map<string, string[]>();
  for (const { id, file } of model.contracts) {
    const number = contractNumber(id) ?? id;
    byNumber.set(number, [...(byNumber.get(number) ?? []), file]);
  }
  return [...byNumber.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([number, files]) =>
      indexIssue(
        `Contract number ${number} is declared by more than one contract: ${files.join(", ")}`,
        files[0] ?? "",
        [number],
      ),
    );
}

function bareCell(cell: string): string {
  return cell.trim().replace(CELL_DECORATION_RE, "").trim();
}

/**
 * Every markdown table in the file, as header + body rows with 1-based lines.
 *
 * The scan runs over {@link maskNonSpecRegions}, so the regions markdown does
 * not render as content — fenced code blocks, HTML comments, top-level indented
 * code — contribute neither tables nor headings. The natural way to document
 * the index is to show a filled-in example table, and reading one as data let
 * the example stand in for the real thing: its rows satisfied both
 * `QFAI-CONTRACT-034` coverage and the `-033` row check while the rendered
 * index still listed no contract at all. Tracking fences alone left the same
 * hole open one `<!-- … -->` away — and that is the form the shipped
 * `05_Contracts.md` template writes its own example rows in, so it is the
 * spelling an author is most likely to copy.
 *
 * The masker blanks lines in place rather than dropping them, which is what
 * keeps every `loc.line` reported from here pointing at the real line.
 */
function parseIndexTables(text: string): IndexTable[] {
  const tables: IndexTable[] = [];
  const lines = maskNonSpecRegions(text).split("\n");
  let heading = "";

  for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
    const headerLine = lines[lineIndex];
    const separatorLine = lines[lineIndex + 1];
    if (headerLine === undefined || separatorLine === undefined) {
      continue;
    }
    // The enclosing section: a deeper heading stays inside the H2 above it.
    const headingMatch = /^ {0,3}(#{1,6})[ \t]+(.*)$/.exec(headerLine);
    if (headingMatch) {
      if ((headingMatch[1] ?? "").length <= 2) heading = headingText(headingMatch[2] ?? "");
      continue;
    }
    if (!looksLikeTableRow(headerLine) || !isDelimiterRow(separatorLine)) {
      continue;
    }

    const rows: IndexTableRow[] = [];
    let rowIndex = lineIndex + 2;
    while (rowIndex < lines.length) {
      const rowLine = lines[rowIndex];
      if (rowLine === undefined || !looksLikeTableRow(rowLine)) {
        break;
      }
      if (!isDelimiterRow(rowLine)) {
        rows.push({ cells: splitMarkdownRow(rowLine), line: rowIndex + 1 });
      }
      rowIndex++;
    }

    tables.push({ headers: splitMarkdownRow(headerLine), rows, line: lineIndex + 1, heading });
    lineIndex = rowIndex - 1;
  }

  return tables;
}

/**
 * A GFM delimiter row: every cell is one or more hyphens, with an optional colon
 * at either end, so `| -- |` separates a header as `| --- |` does.
 */
function isDelimiterRow(line: string): boolean {
  if (!looksLikeTableRow(line)) return false;
  const cells = splitMarkdownRow(line).filter((cell) => cell.length > 0);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeHeaderKey(column: string): string {
  return column.toLowerCase().replace(/[^a-z0-9]/g, "");
}
