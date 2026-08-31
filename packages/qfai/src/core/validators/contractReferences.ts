import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex, type ContractIndex } from "../contractIndex.js";
import { collectSpecEntries } from "../specLayout.js";
import {
  isTableSeparator,
  looksLikeTableRow,
  maskNonSpecRegions,
  splitMarkdownRow,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const FULL_CONTRACT_ID_RE = /\bCON-(API|DB|UI)-(\d+)\b/gi;
const SHORT_CONTRACT_ID_RE = /(?<!CON-)\b(API|DB|UI)-(\d{1,4})\b/gi;
const CONTRACT_INDEX_HEADER_KEYS = new Set(["contractid", "declaredid", "shortid"]);
const DECLARED_ID_HEADER_KEY = "declaredid";
const DEPENDS_ON_HEADER_KEY = "dependson";
const FILE_HEADER_KEY = "file";
/**
 * Columns holding a contract's canonical id, as opposed to an abbreviation of it.
 *
 * `Short ID` is deliberately absent: `API-001` normalizes to `CON-API-0001`, so
 * counting it as coverage lets a row whose `Declared ID` is blank, `-`, or
 * mistyped still claim the contract is indexed.
 */
const CANONICAL_ID_HEADER_KEYS = new Set([DECLARED_ID_HEADER_KEY, "contractid"]);
/** A cell that states "none" rather than an id: `-` in a `Depends On` or a placeholder `Declared ID`. */
const NONE_CELL_RE = /^(?:[-–—]|\[[ \t]*\]|none|なし)$/i;
/**
 * A heading introducing one of the three contract kinds the id rules govern.
 *
 * `Design Contracts` / `Evidence Contracts` / `CLI Contracts` index other
 * artifact kinds by slug and are excluded — matching `CON-(API|DB|UI)-\d+`,
 * the only ids `QFAI-CONTRACT-010` declares.
 */
const CANONICAL_CONTRACT_HEADING_RE = /(?:^|[^A-Za-z])(?:DB|API|UI)[ \t]*(?:Contracts?|契約)/i;
/**
 * A cell that *is* one canonical contract id, decoration aside.
 *
 * Anchored end to end on purpose: a canonical column states the id, it does not
 * merely mention one. Surrounding backticks / emphasis are stripped first
 * because an index author marks up a path or an id freely.
 */
const CANONICAL_CELL_ID_RE = /^CON-(API|DB|UI)-(\d+)$/i;
const CELL_DECORATION_RE = /^[`*_]+|[`*_]+$/g;
/**
 * A concrete contract path inside a `File` cell.
 *
 * The excluded characters are what separates a real path from the shapes the
 * template writes in its examples: a backtick or a pipe bounds the cell, `*`
 * makes it a glob, and `<`/`>` mark a `<slug>` placeholder. None of those names
 * one file, so none of them is matched.
 */
const CONTRACT_PATH_RE = /[^\s`|*<>()[\]]+\.(?:sql|ya?ml|json)\b/gi;

type IndexTableRow = { cells: string[]; line: number };
type IndexTable = { headers: string[]; rows: IndexTableRow[]; line: number; heading: string };

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
    extractMirroredContractIds(text).forEach((contractId) => mirroredIds.add(contractId));
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

/**
 * Contract ids a row actually *claims to index*.
 *
 * `extractContractIds` reads `Short ID` too, which is right for
 * `QFAI-CONTRACT-030` — any id written in the index must resolve — but wrong
 * for coverage. A row carrying `API-001` with a blank, `-`, or mistyped
 * `Declared ID` names no contract: the row checks skip it because they cannot
 * read an id, so counting the short form as coverage silenced
 * `QFAI-CONTRACT-034` as well and the broken row produced no finding at all.
 *
 * A cell resolving to *several* ids is skipped for the same reason. One row
 * reading `CON-API-0001, CON-API-0002` indexes neither contract — it states no
 * single `File` or `Depends On` for either — and {@link validateIndexRows}
 * skips it on the identical test. Crediting both would have left the pair with no
 * unique row anywhere and no finding: `QFAI-CONTRACT-030` stays silent because
 * both ids exist, and `-033` never runs on the row.
 */
function extractMirroredContractIds(text: string): Set<string> {
  const ids = new Set<string>();

  for (const table of parseIndexTables(text)) {
    const canonicalColumns = table.headers
      .map((column, columnIndex) => ({ columnKey: normalizeHeaderKey(column), columnIndex }))
      .filter(({ columnKey }) => CANONICAL_ID_HEADER_KEYS.has(columnKey))
      .map(({ columnIndex }) => columnIndex);
    if (canonicalColumns.length === 0) {
      continue;
    }
    for (const row of table.rows) {
      for (const columnIndex of canonicalColumns) {
        const contractId = canonicalCellContractId(row.cells[columnIndex] ?? "");
        if (contractId) {
          ids.add(contractId);
        }
      }
    }
  }

  return ids;
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

/**
 * The `Depends On` column must exist, and each row must mirror the file it names.
 *
 * The shipped index template carries the column in all three tables and states
 * that it is the only place a multi-file schema's composition is written down —
 * `QFAI-CONTRACT-011` forces that schema into N files. Nothing read the column,
 * so a table could silently drop it, and a row could disagree with the
 * `-- Depends on:` / `x-qfai-depends-on` declaration in the file it names,
 * without producing a finding. All of it is checked here because the index row
 * is the one place the mandated mirror and its source are visible together.
 *
 * The row scan runs even when the column is missing: a wrong `File` cell is a
 * defect of its own, and reporting only `QFAI-CONTRACT-032` would leave every
 * row of that table unread until someone restores the column.
 */
function validateDependsOnColumn(filePath: string, text: string, index: ContractIndex): Issue[] {
  const issues: Issue[] = [];

  for (const table of parseIndexTables(text)) {
    const headerKeys = table.headers.map((column) => normalizeHeaderKey(column));
    // A table with no canonical-id column at all is some other table that
    // happens to name contracts. `Contract ID` counts alongside `Declared ID`:
    // a spec-pack `11_Contracts.md` heads the column that way, and holding only
    // one spelling to the rules left the other free to drop `Depends On`.
    const declaredIdColumn = headerKeys.findIndex((key) => CANONICAL_ID_HEADER_KEYS.has(key));
    if (declaredIdColumn < 0) {
      continue;
    }
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
    }

    issues.push(
      ...validateIndexRows(
        table,
        { declaredIdColumn, dependsOnColumn, fileColumn: headerKeys.indexOf(FILE_HEADER_KEY) },
        filePath,
        index,
      ),
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
 * positive. A table qualifies when a non-empty `Declared ID` cell resolves to
 * exactly one contract id; an empty cell and the `-` placeholder are neutral.
 *
 * Deliberately the *broad* reading, `Short ID` spelling included: this decides
 * only whether the table is held to the rules, and holding one is never the
 * hole. A row whose canonical column states `API-001` still fails coverage —
 * {@link canonicalCellContractId} is the narrow reading and refuses it — so the
 * contract earns `QFAI-CONTRACT-034` while its table keeps owing a
 * `Depends On` column.
 *
 * The verdict is by **evidence, not unanimity**. One canonical row makes the
 * table a contract index even if a sibling row is mistyped: requiring every row
 * to resolve let a single typo disqualify the table, hiding a dropped
 * `Depends On` column and every other row's disagreement behind the one
 * `QFAI-CONTRACT-034` the typo earns. The mistyped row is simply skipped by the
 * row check, which needs an id it can resolve.
 *
 * With no canonical row and at least one foreign one, the table indexes another
 * artifact kind by slug and owes no apply order. With no row stating an id
 * either way — a table with no rows at all included — the enclosing heading
 * decides: an empty Design table is indistinguishable from the shipped
 * `0 items` API table by its rows, and only `### API Contracts` and its DB / UI
 * siblings are the tables these rules were written for.
 */
function declaresCanonicalContractIds(table: IndexTable, declaredIdColumn: number): boolean {
  let canonicalRows = 0;
  let foreignRows = 0;

  for (const row of table.rows) {
    const cell = (row.cells[declaredIdColumn] ?? "").trim();
    if (cell.length === 0 || NONE_CELL_RE.test(cell)) {
      continue;
    }
    const ids = new Set<string>();
    extractCellContractIds(cell, ids);
    if (ids.size === 1) {
      canonicalRows++;
    } else {
      foreignRows++;
    }
  }

  if (canonicalRows > 0) {
    return true;
  }
  if (foreignRows > 0) {
    return false;
  }
  return CANONICAL_CONTRACT_HEADING_RE.test(table.heading);
}

type IndexRowColumns = {
  declaredIdColumn: number;
  dependsOnColumn: number;
  fileColumn: number;
};

function validateIndexRows(
  table: IndexTable,
  columns: IndexRowColumns,
  filePath: string,
  index: ContractIndex,
): Issue[] {
  const issues: Issue[] = [];

  for (const row of table.rows) {
    const contractId = canonicalCellContractId(row.cells[columns.declaredIdColumn] ?? "");
    // An empty / example / multi-id row names no single contract to mirror, and
    // an unknown id is already `QFAI-CONTRACT-030`'s finding.
    if (!contractId || !index.ids.has(contractId)) {
      continue;
    }

    if (columns.fileColumn >= 0) {
      issues.push(
        ...validateRowFile(row.cells[columns.fileColumn] ?? "", contractId, {
          filePath,
          line: row.line,
          index,
        }),
      );
    }
    if (columns.dependsOnColumn >= 0) {
      issues.push(
        ...validateRowDependsOn(row.cells[columns.dependsOnColumn] ?? "", contractId, {
          filePath,
          line: row.line,
          index,
        }),
      );
    }
  }

  return issues;
}

type RowContext = { filePath: string; line: number; index: ContractIndex };

/**
 * The row's `File` must be a file that declares the row's id.
 *
 * The mirror check reads the declaration by id and never looked at this cell, so
 * a row for `CON-API-0001` pointing at `CON-API-0002`'s file passed
 * `QFAI-CONTRACT-030` (both ids exist), `-033` (the dependencies compared are
 * the ones the id really declares) and `-034` (the id is listed) alike, while
 * every reader of the index was sent to the wrong contract.
 */
function validateRowFile(cell: string, contractId: string, context: RowContext): Issue[] {
  const cellPath = rowContractPath(cell);
  if (!cellPath || namesDeclaringFile(cellPath, context.index.idToFiles.get(contractId))) {
    return [];
  }
  return [
    issue(
      "QFAI-CONTRACT-035",
      `契約インデックスの \`File\` が ${contractId} を宣言していないファイルを指しています: ${cellPath}`,
      "warning",
      context.filePath,
      "contracts.index.fileDeclaresId",
      [contractId],
      "change",
      "`File` 列を、その行の `Declared ID` を `QFAI-CONTRACT-ID` として宣言している契約ファイルのパスに直してください。",
      { loc: { line: context.line } },
    ),
  ];
}

/**
 * The one contract file a `File` cell names, or `undefined` when it names none.
 *
 * A glob (`.qfai/contracts/ui/*.yaml`), a `<slug>` placeholder, a bare directory
 * and a cell naming two paths are all left unmatched on purpose: none of them
 * points at a single file to check, and the shipped template writes its example
 * rows that way.
 */
function rowContractPath(cell: string): string | undefined {
  const matches = cell.match(CONTRACT_PATH_RE);
  return matches?.length === 1 ? matches[0] : undefined;
}

/** Whether the cell's path is one of the files declaring the id. */
function namesDeclaringFile(cellPath: string, files: Set<string> | undefined): boolean {
  const wanted = toPosixPath(cellPath).replace(/^(?:\.\/)+/, "");
  for (const declaringFile of files ?? []) {
    const declared = toPosixPath(declaringFile);
    if (declared === wanted || declared.endsWith(`/${wanted}`)) {
      return true;
    }
  }
  return false;
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

/** The row's `Depends On` cell must state what the contract file declares. */
function validateRowDependsOn(rawCell: string, contractId: string, context: RowContext): Issue[] {
  const dependsOnCell = rawCell.trim();
  const rowDependencies = new Set<string>();
  extractCellContractIds(dependsOnCell, rowDependencies);
  // A blank cell is silence, not "no dependencies". Comparing sets alone
  // would normalize it to the same empty set an explicit `-` produces, so the
  // very distinction this column exists to record would stay unmade in the
  // index — a contract declaring `-` and one declaring nothing read alike.
  if (rowDependencies.size === 0 && !NONE_CELL_RE.test(dependsOnCell)) {
    return [
      issue(
        "QFAI-CONTRACT-033",
        `契約インデックスの \`Depends On\` セルが適用順を記載していません: ${contractId}`,
        "warning",
        context.filePath,
        "contracts.index.dependsOnMirror",
        [contractId],
        "change",
        "`Depends On` 列に先に適用すべき契約 ID を記載してください。依存が無い場合は `-` と明記します（空欄は「未記載」であり「依存なし」ではありません）。",
        { loc: { line: context.line } },
      ),
    ];
  }

  const fileDependencies = context.index.idToDependencies.get(contractId) ?? new Set<string>();
  const missing = Array.from(fileDependencies)
    .filter((dependency) => !rowDependencies.has(dependency))
    .sort();
  const extra = Array.from(rowDependencies)
    .filter((dependency) => !fileDependencies.has(dependency))
    .sort();
  if (missing.length === 0 && extra.length === 0) {
    return [];
  }

  const parts = [
    missing.length > 0 ? `契約ファイル側のみ: ${missing.join(", ")}` : "",
    extra.length > 0 ? `インデックス側のみ: ${extra.join(", ")}` : "",
  ].filter((part) => part.length > 0);
  return [
    issue(
      "QFAI-CONTRACT-033",
      `契約インデックスの \`Depends On\` が契約ファイルの宣言と一致しません: ${contractId} (${parts.join(" / ")})`,
      "warning",
      context.filePath,
      "contracts.index.dependsOnMirror",
      [contractId, ...missing, ...extra],
      "change",
      "契約ファイルの `-- Depends on:` / `x-qfai-depends-on` と `Depends On` 列を同じ内容に揃えてください（依存が無い場合は `-`）。",
      { loc: { line: context.line } },
    ),
  ];
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

function normalizeHeaderKey(column: string): string {
  return column.toLowerCase().replace(/[^a-z0-9]/g, "");
}
