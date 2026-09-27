import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import {
  isTableSeparator,
  looksLikeTableRow,
  maskNonSpecRegions,
  splitMarkdownRow,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";
import { CONTRACT_KIND_BY_DIR, contractNumber } from "../storyTree/ids.js";
import type { StoryTreeModel } from "../storyTree/tree.js";
import { resolveStoryTreeRoots } from "../storyTree/layout.js";

/**
 * A cell that *is* one canonical contract id, decoration aside.
 *
 * Anchored end to end on purpose: a canonical column states the id, it does not
 * merely mention one. Surrounding backticks / emphasis are stripped first
 * because an index author marks up a path or an id freely.
 */
const CANONICAL_CELL_ID_RE = /^CON-(API|DB|UI)-(\d+)$/i;
const CELL_DECORATION_RE = /^[`*_]+|[`*_]+$/g;

type IndexTableRow = { cells: string[]; line: number };
type IndexTable = { headers: string[]; rows: IndexTableRow[]; line: number; heading: string };

/** Checks the story-tree contract index, including CLI and design files. */
export async function validateStoryTreeContractReferences(
  root: string,
  config: QfaiConfig,
  model: StoryTreeModel,
): Promise<Issue[]> {
  const { contractsDir } = resolveStoryTreeRoots(root, config);
  const indexFile = path.join(contractsDir, "contracts.md");
  const tables = parseIndexTables(await readSafe(indexFile));
  const current = tables.find(
    (table) => table.headers.map(normalizeHeaderKey).join("|") === INDEX_COLUMNS,
  );
  if (current) {
    return validateContractIndex({ root, contractsDir, indexFile }, current.rows, model);
  }
  // SIMPLIFIED: an index without the `ID | Title | File | Depends On | Reconciled With |
  // Purpose` columns is still read by its `Declared ID` and `File` columns.
  // Lift when: the story tree and shipped templates no longer use the old contract and rule IDs.
  const indexedIds = new Set<string>();
  const indexedPaths = new Set<string>();
  for (const table of tables) {
    const headers = table.headers.map(normalizeHeaderKey);
    const idColumn = headers.indexOf("declaredid");
    const fileColumn = headers.indexOf("file");
    if (idColumn < 0 || fileColumn < 0) continue;
    for (const row of table.rows) {
      const id = canonicalCellContractId(row.cells[idColumn] ?? "");
      if (id) indexedIds.add(id);
      const listed = (row.cells[fileColumn] ?? "").trim().replace(/^[`*]+|[`*]+$/g, "");
      if (listed) indexedPaths.add(toPosixPath(listed).replace(/^\.\//, ""));
    }
  }
  const index = await buildContractIndex(root, config);
  const issues: Issue[] = [];
  const listedPath = (file: string): boolean => {
    const relative = toPosixPath(path.relative(contractsDir, file));
    const repoRelative = toPosixPath(path.relative(root, file));
    return (
      indexedPaths.has(relative) ||
      indexedPaths.has(repoRelative) ||
      indexedPaths.has(toPosixPath(file))
    );
  };
  for (const file of model.contractFiles) {
    const declared = [...index.idToFiles.entries()]
      .filter(([, paths]) =>
        [...paths].some((candidate) => path.resolve(candidate) === path.resolve(file)),
      )
      .map(([id]) => id);
    if (declared.length > 0) {
      for (const id of declared) {
        if (indexedIds.has(id) && listedPath(file)) continue;
        issues.push(
          issue(
            "QFAI-CONTRACT-034",
            `Contract ${id} is not listed with its file in ${indexFile}: ${file}`,
            "error",
            file,
            "contracts.storyTreeIndex",
            [id],
          ),
        );
      }
      continue;
    }
    if (model.additionalContractFiles.includes(file) && !listedPath(file)) {
      issues.push(
        issue(
          "QFAI-CONTRACT-034",
          `Contract file is not listed in ${indexFile}: ${file}`,
          "error",
          file,
          "contracts.storyTreeIndex",
          [file],
        ),
      );
    }
  }
  return issues;
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
 * one contract, and every row names a contract file.
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
    const kind = contractKind(relative);
    if (!kind) continue;
    const spellings = [
      relative,
      toPosixPath(path.relative(location.root, file)),
      toPosixPath(file),
    ];
    const row = listed.find((entry) => spellings.includes(entry.file));
    if (row) matched.add(row);
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
 * The one canonical id a `Declared ID` / `Contract ID` cell states, if it states
 * one.
 *
 * The cell must **be** a full `CON-(API|DB|UI)-*` id, not merely contain
 * something that normalizes to one. `extractCellContractIds` also reads the
 * short spelling, which is right for `QFAI-CONTRACT-030` — every id written
 * anywhere in an index must resolve — and wrong here: a canonical cell reading
 * `API-001` normalized to `CON-API-0001`, so a row that never states the
 * canonical id counted as coverage and silenced `QFAI-CONTRACT-034`, while the
 * row checks skipped that same row for want of an id it could read. The digits
 * are kept verbatim, as `extractDeclaredContractIds` keeps them, so a cell and
 * the file's own declaration compare as written.
 */
function canonicalCellContractId(cell: string): string | undefined {
  const bare = cell.trim().replace(CELL_DECORATION_RE, "").trim();
  const match = CANONICAL_CELL_ID_RE.exec(bare);
  const kind = match?.[1]?.toUpperCase();
  const number = match?.[2];
  return kind && number ? `CON-${kind}-${number}` : undefined;
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
    const headingMatch = /^#{1,6}[ \t]+(.*)$/.exec(headerLine);
    if (headingMatch) {
      heading = (headingMatch[1] ?? "").trim();
      continue;
    }
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) {
      continue;
    }

    const rows: IndexTableRow[] = [];
    let rowIndex = lineIndex + 2;
    while (rowIndex < lines.length) {
      const rowLine = lines[rowIndex];
      if (rowLine === undefined || !looksLikeTableRow(rowLine)) {
        break;
      }
      if (!isTableSeparator(rowLine)) {
        rows.push({ cells: splitMarkdownRow(rowLine), line: rowIndex + 1 });
      }
      rowIndex++;
    }

    tables.push({ headers: splitMarkdownRow(headerLine), rows, line: lineIndex + 1, heading });
    lineIndex = rowIndex - 1;
  }

  return tables;
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeHeaderKey(column: string): string {
  return column.toLowerCase().replace(/[^a-z0-9]/g, "");
}
