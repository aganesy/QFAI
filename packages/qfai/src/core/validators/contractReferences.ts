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
