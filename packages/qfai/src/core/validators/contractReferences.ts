import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex, type ContractIndex } from "../contractIndex.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const FULL_CONTRACT_ID_RE = /\bCON-(API|DB|UI)-(\d+)\b/gi;
const SHORT_CONTRACT_ID_RE = /(?<!CON-)\b(API|DB|UI)-(\d{1,4})\b/gi;
const CONTRACT_INDEX_HEADER_KEYS = new Set(["contractid", "declaredid", "shortid"]);
const DECLARED_ID_HEADER_KEY = "declaredid";
const DEPENDS_ON_HEADER_KEY = "dependson";
/** A cell that states "none" rather than an id: `-` in a `Depends On` or a placeholder `Declared ID`. */
const NONE_CELL_RE = /^(?:[-–—]|\[[ \t]*\]|none|なし)$/i;

type IndexTableRow = { cells: string[]; line: number };
type IndexTable = { headers: string[]; rows: IndexTableRow[]; line: number };

export async function validateContractReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const contractIndex = await buildContractIndex(root, config);

  const contractIndexFiles = new Set<string>();
  for (const entry of entries) {
    if (entry.layout !== "layered" && entry.layout !== "spec-pack") {
      continue;
    }
    contractIndexFiles.add(entry.contractsIndexPath);
  }

  const issues: Issue[] = [];
  const severity = config.validation.traceability.unknownContractIdSeverity;
  const mirroredIds = new Set<string>();
  for (const filePath of Array.from(contractIndexFiles).sort((a, b) => a.localeCompare(b))) {
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }

    const referencedIds = extractContractIds(text);
    referencedIds.forEach((contractId) => mirroredIds.add(contractId));
    for (const contractId of referencedIds) {
      if (contractIndex.ids.has(contractId)) {
        continue;
      }
      issues.push(
        issue(
          "QFAI-CONTRACT-030",
          `契約インデックスが未定義の契約IDを参照しています: ${contractId}`,
          severity,
          filePath,
          "contracts.referenceExists",
          [contractId],
          "canonical",
          "契約IDに対応するファイルを `.qfai/contracts/**` に追加し、`QFAI-CONTRACT-ID` 宣言を一致させてください。",
        ),
      );
    }

    issues.push(...validateDependsOnColumn(filePath, text, contractIndex));
  }

  if (contractIndexFiles.size > 0) {
    issues.push(...validateIndexCoverage(mirroredIds, contractIndex));
  }

  return issues;
}

/**
 * Every contract must appear in a contract index.
 *
 * `QFAI-CONTRACT-030` reads index → files and `QFAI-CONTRACT-033` compares a
 * row against the file it names, so both need a row to exist. Delete the row
 * and the contract — and the apply order it declares — becomes invisible to
 * everyone reading the index, with no finding anywhere. The mirrored set is
 * accumulated across *all* index files first: a spec-pack repo keeps one index
 * per spec while contracts are global, so a per-file check would report every
 * contract against every other spec's index.
 */
function validateIndexCoverage(mirroredIds: Set<string>, index: ContractIndex): Issue[] {
  const issues: Issue[] = [];

  for (const contractId of Array.from(index.ids).sort((a, b) => a.localeCompare(b))) {
    if (mirroredIds.has(contractId)) {
      continue;
    }
    const files = Array.from(index.idToFiles.get(contractId) ?? []).sort((a, b) =>
      a.localeCompare(b),
    );
    issues.push(
      issue(
        "QFAI-CONTRACT-034",
        `契約がどの契約インデックスにも記載されていません: ${contractId}`,
        "warning",
        files[0],
        "contracts.index.coverage",
        [contractId],
        "change",
        "`_policies/05_Contracts.md`（spec-pack では `11_Contracts.md`）の該当表に行を追加し、`Declared ID` と `Depends On` を記載してください。",
        files.length > 1 ? { relatedFiles: files.slice(1) } : undefined,
      ),
    );
  }

  return issues;
}

function extractContractIds(text: string): string[] {
  const ids = new Set<string>();

  for (const table of parseIndexTables(text)) {
    const targetColumnIndexes = table.headers
      .map((column, columnIndex) => ({
        columnKey: normalizeHeaderKey(column),
        columnIndex,
      }))
      .filter((column) => CONTRACT_INDEX_HEADER_KEYS.has(column.columnKey))
      .map((column) => column.columnIndex);

    if (targetColumnIndexes.length === 0) {
      continue;
    }

    for (const row of table.rows) {
      for (const columnIndex of targetColumnIndexes) {
        const cell = row.cells[columnIndex];
        if (!cell) {
          continue;
        }
        extractCellContractIds(cell, ids);
      }
    }
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

/** Every markdown table in the file, as header + body rows with 1-based lines. */
function parseIndexTables(text: string): IndexTable[] {
  const tables: IndexTable[] = [];
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
    const headerLine = lines[lineIndex];
    const separatorLine = lines[lineIndex + 1];
    if (headerLine === undefined || separatorLine === undefined) {
      continue;
    }
    if (!isTableRow(headerLine) || !isSeparatorRow(separatorLine)) {
      continue;
    }

    const rows: IndexTableRow[] = [];
    let rowIndex = lineIndex + 2;
    while (rowIndex < lines.length) {
      const rowLine = lines[rowIndex];
      if (rowLine === undefined || !isTableRow(rowLine)) {
        break;
      }
      if (!isSeparatorRow(rowLine)) {
        rows.push({ cells: parseTableRow(rowLine), line: rowIndex + 1 });
      }
      rowIndex++;
    }

    tables.push({ headers: parseTableRow(headerLine), rows, line: lineIndex + 1 });
    lineIndex = rowIndex - 1;
  }

  return tables;
}

/**
 * The `Depends On` column must exist, and must mirror the contract files.
 *
 * The shipped index template carries the column in all three tables and states
 * that it is the only place a multi-file schema's composition is written down —
 * `QFAI-CONTRACT-011` forces that schema into N files. Nothing read the column,
 * so a table could silently drop it, and a row could disagree with the
 * `-- Depends on:` / `x-qfai-depends-on` declaration in the file it names,
 * without producing a finding. Both are checked here because the index row is
 * the one place the mandated mirror and its source are visible together.
 */
function validateDependsOnColumn(filePath: string, text: string, index: ContractIndex): Issue[] {
  const issues: Issue[] = [];

  for (const table of parseIndexTables(text)) {
    const headerKeys = table.headers.map((column) => normalizeHeaderKey(column));
    // Only the shipped contract-index shape is held to this: a table without a
    // `Declared ID` column is some other table that happens to name contracts.
    if (!headerKeys.includes(DECLARED_ID_HEADER_KEY)) {
      continue;
    }
    const declaredIdColumn = headerKeys.indexOf(DECLARED_ID_HEADER_KEY);
    if (!declaresCanonicalContractIds(table, declaredIdColumn)) {
      continue;
    }
    const dependsOnColumn = headerKeys.indexOf(DEPENDS_ON_HEADER_KEY);

    if (dependsOnColumn < 0) {
      issues.push(
        issue(
          "QFAI-CONTRACT-032",
          `契約インデックスの表に \`Depends On\` 列がありません: ${table.headers.join(" | ")}`,
          "warning",
          filePath,
          "contracts.index.dependsOnColumn",
          undefined,
          "change",
          "`| Short ID | ... | Declared ID | File | Depends On | Purpose |` の形に列を戻し、各行に適用順の依存関係（無い場合は `-`）を記載してください。",
          { loc: { line: table.line } },
        ),
      );
      continue;
    }

    issues.push(
      ...validateDependsOnRows(table, { declaredIdColumn, dependsOnColumn }, filePath, index),
    );
  }

  return issues;
}

/**
 * Whether a `Declared ID` table is the apply-order index, not a lookalike.
 *
 * `Declared ID` alone is too broad. A long-lived `_policies/05_Contracts.md`
 * also carries Design and UI tables whose `Declared ID` holds a slug
 * (`design-system`, `screens`) rather than a `CON-*` id; those name no
 * apply-order participants — design contracts are outside the id-declaration
 * rule entirely — so demanding a `Depends On` column of them is a false
 * positive. A table qualifies when every non-empty `Declared ID` cell resolves
 * to exactly one canonical contract id; an empty cell and the `-` placeholder
 * are neutral, which is what keeps the shipped `0 items` template — the table
 * with no contracts yet — under the column check.
 */
function declaresCanonicalContractIds(table: IndexTable, declaredIdColumn: number): boolean {
  for (const row of table.rows) {
    const cell = (row.cells[declaredIdColumn] ?? "").trim();
    if (cell.length === 0 || NONE_CELL_RE.test(cell)) {
      continue;
    }
    const ids = new Set<string>();
    extractCellContractIds(cell, ids);
    if (ids.size !== 1) {
      return false;
    }
  }
  return true;
}

function validateDependsOnRows(
  table: IndexTable,
  columns: { declaredIdColumn: number; dependsOnColumn: number },
  filePath: string,
  index: ContractIndex,
): Issue[] {
  const issues: Issue[] = [];

  for (const row of table.rows) {
    const declaredIds = new Set<string>();
    extractCellContractIds(row.cells[columns.declaredIdColumn] ?? "", declaredIds);
    const contractId = declaredIds.size === 1 ? Array.from(declaredIds)[0] : undefined;
    // An empty / example / multi-id row names no single contract to mirror, and
    // an unknown id is already `QFAI-CONTRACT-030`'s finding.
    if (!contractId || !index.ids.has(contractId)) {
      continue;
    }

    const dependsOnCell = (row.cells[columns.dependsOnColumn] ?? "").trim();
    const rowDependencies = new Set<string>();
    extractCellContractIds(dependsOnCell, rowDependencies);
    // A blank cell is silence, not "no dependencies". Comparing sets alone
    // would normalize it to the same empty set an explicit `-` produces, so the
    // very distinction this column exists to record would stay unmade in the
    // index — a contract declaring `-` and one declaring nothing read alike.
    if (rowDependencies.size === 0 && !NONE_CELL_RE.test(dependsOnCell)) {
      issues.push(
        issue(
          "QFAI-CONTRACT-033",
          `契約インデックスの \`Depends On\` セルが適用順を記載していません: ${contractId}`,
          "warning",
          filePath,
          "contracts.index.dependsOnMirror",
          [contractId],
          "change",
          "`Depends On` 列に先に適用すべき契約 ID を記載してください。依存が無い場合は `-` と明記します（空欄は「未記載」であり「依存なし」ではありません）。",
          { loc: { line: row.line } },
        ),
      );
      continue;
    }
    const fileDependencies = index.idToDependencies.get(contractId) ?? new Set<string>();
    const missing = Array.from(fileDependencies)
      .filter((dependency) => !rowDependencies.has(dependency))
      .sort();
    const extra = Array.from(rowDependencies)
      .filter((dependency) => !fileDependencies.has(dependency))
      .sort();
    if (missing.length === 0 && extra.length === 0) {
      continue;
    }

    const parts = [
      missing.length > 0 ? `契約ファイル側のみ: ${missing.join(", ")}` : "",
      extra.length > 0 ? `インデックス側のみ: ${extra.join(", ")}` : "",
    ].filter((part) => part.length > 0);
    issues.push(
      issue(
        "QFAI-CONTRACT-033",
        `契約インデックスの \`Depends On\` が契約ファイルの宣言と一致しません: ${contractId} (${parts.join(" / ")})`,
        "warning",
        filePath,
        "contracts.index.dependsOnMirror",
        [contractId, ...missing, ...extra],
        "change",
        "契約ファイルの `-- Depends on:` / `x-qfai-depends-on` と `Depends On` 列を同じ内容に揃えてください（依存が無い場合は `-`）。",
        { loc: { line: row.line } },
      ),
    );
  }

  return issues;
}

function extractCellContractIds(cell: string, ids: Set<string>): void {
  for (const match of cell.matchAll(FULL_CONTRACT_ID_RE)) {
    const kind = match[1]?.toUpperCase();
    const number = match[2];
    if (!kind || !number) {
      continue;
    }
    ids.add(`CON-${kind}-${number}`);
  }

  for (const match of cell.matchAll(SHORT_CONTRACT_ID_RE)) {
    const kind = match[1]?.toUpperCase();
    const number = match[2];
    if (!kind || !number) {
      continue;
    }
    ids.add(`CON-${kind}-${number.padStart(4, "0")}`);
  }
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|");
}

function isSeparatorRow(line: string): boolean {
  if (!isTableRow(line)) {
    return false;
  }
  const cells = parseTableRow(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => {
      const normalized = cell.trim();
      return /^:?-{3,}:?$/.test(normalized);
    })
  );
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutLeadingPipe = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutEdgePipes = withoutLeadingPipe.endsWith("|")
    ? withoutLeadingPipe.slice(0, -1)
    : withoutLeadingPipe;
  return withoutEdgePipes.split("|").map((cell) => cell.trim());
}

function normalizeHeaderKey(column: string): string {
  return column.toLowerCase().replace(/[^a-z0-9]/g, "");
}
