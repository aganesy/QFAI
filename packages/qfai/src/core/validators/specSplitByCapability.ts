import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import {
  looksLikeTableRow,
  maskNonSpecRegions,
  type MarkdownTable,
  parseAllMarkdownTables,
  splitMarkdownRow,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;

const CAP_ID_HEADER_RE = /^cap\s*id$/i;

/**
 * Matches the template heading `## CAP Catalog` (and a single parenthesised
 * qualifier such as `## CAP Catalog (required)` / `（必須）`), and nothing
 * else. `## CAP Catalog Notes` documents the catalog — it is not the catalog.
 */
const CAP_CATALOG_HEADING = /^ {0,3}(#{1,6})\s*cap\s*catalog\s*(?:\([^)]*\)|（[^）]*）)?\s*$/i;

/** Any ATX heading, with the 0-3 leading spaces CommonMark permits. */
const ANY_HEADING = /^ {0,3}(#{1,6})\s+\S/;

/**
 * Body of the `## CAP Catalog` section, or `null` when the document has no
 * such heading. The section ends at the next heading of the same or a higher
 * level, mirroring `extractTestCaseTableSection`.
 */
function extractCapCatalogSection(text: string): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => CAP_CATALOG_HEADING.test(line));
  if (start === -1) {
    return null;
  }
  const level = (CAP_CATALOG_HEADING.exec(lines[start] ?? "")?.[1] ?? "#").length;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = ANY_HEADING.exec(lines[index] ?? "");
    if (match && (match[1] ?? "").length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function hasCapIdColumn(table: MarkdownTable): boolean {
  return table.headers.some((header) => CAP_ID_HEADER_RE.test(header));
}

/**
 * The one table whose row order defines the CAP -> spec-NNNN assignment.
 *
 * Section-first: when `## CAP Catalog` exists only that section is searched,
 * so a second table elsewhere in the document (a reference matrix, an owner
 * list) cannot contribute rows. Without the heading — older policy files — the
 * first `CAP ID`-bearing table anywhere in the document is used, and failing
 * that the first table at all, which is what the column-0 default assumes.
 *
 * Takes text already passed through `maskNonSpecRegions`, so an illustrative
 * heading or table cannot win either resolution step.
 */
function resolveCatalogTable(maskedText: string): MarkdownTable | null {
  const section = extractCapCatalogSection(maskedText);
  const tables = parseAllMarkdownTables(section ?? maskedText);
  return tables.find(hasCapIdColumn) ?? tables[0] ?? null;
}

/** CAP Catalog テーブルの `CAP ID` 列位置。見出しが無ければ先頭列とみなす。 */
function findCapIdColumn(headers: string[]): number {
  const index = headers.findIndex((header) => CAP_ID_HEADER_RE.test(header));
  return index >= 0 ? index : 0;
}

/**
 * CAP Catalog テーブルの各行から `CAP ID` セルの CAP を行順に取り出す。
 * 表の外の地の文、`Notes` セルの CAP 参照、CAP Catalog 節の外にある別の表は
 * spec-NNNN の割り当て順に参加させない。行の分割は `splitMarkdownRow`
 * (`parseAllMarkdownTables` 経由) に任せるので、セル内のエスケープ済み `\|`
 * で列位置がずれることはない。テーブルから 1 件も取れない場合のみ、旧挙動である
 * ファイル全体走査に落とす (箇条書きだけで CAP を並べた既存プロジェクト用)。
 *
 * 見出し探索・表の解析・全体走査フォールバックはいずれも、fenced code block /
 * HTML コメント / インデントコードを `maskNonSpecRegions` で伏せた同一のテキスト
 * に対して行う (`resolveTestCaseTable` と同じ手順)。この文書は自分自身の書式を
 * 例示することがあり、伏せずに探すと実カタログより前に置かれた例示の見出しが
 * 節の開始点に選ばれ、直後の実見出しでその節が閉じてしまう。旧実装の全体走査は
 * 重複を除いたので例示は実カタログの前置きとして吸収されたが、節ベースの解決では
 * 例示がカタログそのものを置き換え、CAP 件数と割り当て順が壊れる。
 */
function extractCatalogCapIds(rawText: string): string[] {
  const text = maskNonSpecRegions(rawText);
  const table = resolveCatalogTable(text);
  const capIds: string[] = [];
  if (table) {
    const capIdColumn = findCapIdColumn(table.headers);
    for (const cells of table.rows) {
      const [capId] = uniqueMatches(cells[capIdColumn] ?? "", CAP_ID_RE);
      if (!capId || capIds.includes(capId)) {
        continue;
      }
      capIds.push(capId);
    }
  }
  return capIds.length > 0 ? capIds : uniqueMatches(text, CAP_ID_RE);
}

const CAP_ID_CELL_RE = /\bCAP-\d{4}\b/;
const SPEC_ID_CELL_RE = /\bspec-\d{4}\b/gi;
const CAP_HEADER_RE = /^cap(\s*id)?$/i;
const SPEC_HEADER_RE = /^spec(\s*(id|dir|directory))?$/i;
/** A GFM alignment cell (`---`, `:---`, `---:`, `:---:`). */
const DELIMITER_CELL_RE = /^:?-+:?$/;
/** The catalog's own heading, at any ATX level (`## CAP Catalog`). */
const CAP_CATALOG_HEADING_RE = /^#{1,6}\s+CAP\s+Catalog\s*$/i;
/** Any ATX heading, which closes the section opened by the one above. */
const HEADING_RE = /^#{1,6}\s/;

/**
 * Splits a markdown table row into trimmed cells; `[]` when the line is not a
 * row.
 *
 * Delegates to the repository's {@link splitMarkdownRow}, whose contract is
 * that `\|` is a literal pipe inside a cell rather than a column boundary — a
 * hand-split on `|` would cut `owner \| spec-0001` in two and lose the spec id
 * the cell actually declares.
 */
function tableCells(line: string): string[] {
  return looksLikeTableRow(line) ? splitMarkdownRow(line) : [];
}

/**
 * The lines that belong to the `## CAP Catalog` section.
 *
 * The catalog is the table under that heading, so a migration or audit table
 * placed earlier in the file can never be adopted as the catalog. Documents
 * with no such heading fall back to the whole file, which keeps catalogs
 * authored before the heading became canonical parseable.
 */
function catalogSectionLines(lines: readonly string[]): readonly string[] {
  const start = lines.findIndex((line) => CAP_CATALOG_HEADING_RE.test(line.trim()));
  if (start < 0) {
    return lines;
  }
  const body = lines.slice(start + 1);
  const end = body.findIndex((line) => HEADING_RE.test(line));
  return end < 0 ? body : body.slice(0, end);
}

interface CatalogRow {
  readonly capId: string;
  /**
   * The **distinct** spec directories the row's `Spec` cell named, lower-cased,
   * in cell order. Distinct is what "exactly one" is measured against: a
   * markdown link writes the same id twice, once as the label and once as the
   * target, and that is still a single declaration.
   */
  readonly specIds: readonly string[];
}

interface DeclaredCatalog {
  /** Every CAP row of the catalog table, in declaration order. */
  readonly rows: readonly CatalogRow[];
  /**
   * The directory each CAP declared. A CAP is absent when no row of its own
   * named exactly one directory — a blank cell and a cell listing several are
   * both unresolved, and each draws its own `QFAI-SPLIT-106`.
   */
  readonly byCap: ReadonlyMap<string, string>;
}

/** True for a GFM alignment row (`| --- | :--- |`), which closes the header. */
function isDelimiterRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL_RE.test(cell));
}

/**
 * Reads the contiguous body rows of the catalog table starting at `start`.
 *
 * The table ends at the first line that is not a row, so a later table that
 * happens to reuse the same column positions (a change log, for instance) is
 * never folded into the catalog.
 */
function readCatalogBody(
  lines: readonly string[],
  start: number,
  capColumn: number,
  specColumn: number,
): DeclaredCatalog {
  const rows: CatalogRow[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const cells = tableCells(lines[index] ?? "");
    if (cells.length === 0) {
      break;
    }
    const capId = cells[capColumn]?.match(CAP_ID_CELL_RE)?.[0];
    if (!capId) {
      continue;
    }
    const specCell = cells[specColumn] ?? "";
    // Case-normalise first, then de-duplicate: the cell may spell one directory
    // several ways — `[spec-0001](../spec-0001)` repeats it, a link label may
    // capitalise it — and counting raw matches would read that single, valid
    // declaration as an ambiguous multi-spec one.
    const specIds = Array.from(
      new Set(Array.from(specCell.matchAll(SPEC_ID_CELL_RE), (match) => match[0].toLowerCase())),
    );
    rows.push({ capId, specIds });
  }
  const byCap = new Map<string, string>();
  for (const row of rows) {
    const [only] = row.specIds;
    if (row.specIds.length === 1 && only !== undefined && !byCap.has(row.capId)) {
      byCap.set(row.capId, only);
    }
  }
  return { rows, byCap };
}

/**
 * Reads the CAP catalog table as a declared CAP -> spec directory mapping.
 *
 * `capabilityText` must already be masked (see {@link maskNonSpecRegions}): the
 * catalog document illustrates its own format, so a commented-out predecessor
 * table or a fenced example sitting above the live table would otherwise be
 * returned as the catalog, and the live table's own breaches would go unseen.
 *
 * The search is bounded to the `## CAP Catalog` section, and inside it only
 * the first well-formed markdown table that carries both headers is parsed —
 * header row, alignment row, then its own consecutive body rows. Declared mode
 * is decided by the presence of the spec column, not by how many cells are
 * filled in: a catalog that adds the column and leaves every cell empty
 * declares an empty mapping (every CAP then draws `QFAI-SPLIT-106`) rather
 * than silently falling back to the positional derivation. Returns `null` only
 * when no such table carries a spec column at all.
 */
function parseDeclaredCatalog(capabilityText: string): DeclaredCatalog | null {
  const lines = catalogSectionLines(capabilityText.split(/\r?\n/));
  for (let index = 0; index < lines.length; index += 1) {
    const header = tableCells(lines[index] ?? "");
    if (header.length === 0) {
      continue;
    }
    const capColumn = header.findIndex((cell) => CAP_HEADER_RE.test(cell));
    const specColumn = header.findIndex((cell) => SPEC_HEADER_RE.test(cell));
    if (capColumn < 0 || specColumn < 0) {
      continue;
    }
    if (!isDelimiterRow(tableCells(lines[index + 1] ?? ""))) {
      continue;
    }
    return readCatalogBody(lines, index + 2, capColumn, specColumn);
  }
  return null;
}

/** CAP ids whose catalog row names more than one spec directory. */
function ambiguousCapIds(catalog: DeclaredCatalog): string[] {
  const ambiguous: string[] = [];
  for (const row of catalog.rows) {
    if (row.specIds.length > 1 && !ambiguous.includes(row.capId)) {
      ambiguous.push(row.capId);
    }
  }
  return ambiguous;
}

/** CAP ids the declared mapping cannot resolve to a single spec directory. */
function unresolvedCapIds(catalog: DeclaredCatalog, capIds: string[]): string[] {
  return capIds.filter((capId) => !catalog.byCap.has(capId));
}

/** CAP ids whose catalog row declares no spec directory at all. */
function undeclaredCapIds(catalog: DeclaredCatalog, capIds: string[]): string[] {
  const ambiguous = new Set(ambiguousCapIds(catalog));
  return unresolvedCapIds(catalog, capIds).filter((capId) => !ambiguous.has(capId));
}

/** CAP ids that occupy more than one catalog row. */
function repeatedCapIds(catalog: DeclaredCatalog): string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const row of catalog.rows) {
    if (!seen.has(row.capId)) {
      seen.add(row.capId);
      continue;
    }
    if (!repeated.includes(row.capId)) {
      repeated.push(row.capId);
    }
  }
  return repeated;
}

/** Spec directories claimed by more than one CAP, rendered for the message. */
function reusedSpecIds(catalog: DeclaredCatalog): string[] {
  const owners = new Map<string, string[]>();
  for (const [capId, specId] of catalog.byCap) {
    owners.set(specId, [...(owners.get(specId) ?? []), capId]);
  }
  return Array.from(owners.entries())
    .filter(([, caps]) => caps.length > 1)
    .map(([specId, caps]) => `${specId} (${caps.join(", ")})`);
}

/** Flags CAP rows the declared mapping cannot resolve, and spec ids it reuses. */
function declaredMappingIssues(
  catalog: DeclaredCatalog,
  capIds: string[],
  capabilitiesPath: string,
): Issue[] {
  const issues: Issue[] = [];
  const undeclared = undeclaredCapIds(catalog, capIds);
  if (undeclared.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `Spec 列に spec ディレクトリが宣言されていない CAP があります: ${undeclared.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        undeclared,
      ),
    );
  }
  const ambiguous = ambiguousCapIds(catalog);
  if (ambiguous.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `Spec 列に複数の spec ディレクトリを宣言している CAP があります: ${ambiguous.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        ambiguous,
      ),
    );
  }
  const repeated = repeatedCapIds(catalog);
  if (repeated.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `同じ CAP が複数の行に登場しています: ${repeated.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        repeated,
      ),
    );
  }
  const duplicated = reusedSpecIds(catalog);
  if (duplicated.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `複数の CAP が同じ spec ディレクトリを宣言しています: ${duplicated.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredMapping",
        duplicated,
      ),
    );
  }
  return issues;
}

/** Requires each spec's `01_Spec.md` to cite the CAP that owns it. */
async function capReferenceIssues(
  capIds: string[],
  expectedSpecIds: (string | null)[],
  layeredEntries: SpecEntry[],
): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (let index = 0; index < capIds.length; index += 1) {
    const capId = capIds[index];
    const specId = expectedSpecIds[index];
    if (!capId || !specId) {
      continue;
    }
    const entry = layeredEntries.find((value) => path.basename(value.dir).toLowerCase() === specId);
    if (!entry) {
      continue;
    }
    const specFilePath = path.join(entry.dir, "01_Spec.md");
    const specText = await readSafe(specFilePath);
    if (specText.trim().length === 0 || !specText.includes(capId)) {
      issues.push(
        issue(
          "QFAI-SPLIT-105",
          `01_Spec.md が CAP を参照していません: ${specId} -> ${capId}`,
          "error",
          specFilePath,
          "specSplitByCapability.specParent",
          [specId, capId],
        ),
      );
    }
  }
  return issues;
}

/**
 * Spec directories for a list of `spec-NNNN` ids, for `details.relatedFiles`.
 *
 * The three count findings are filed against `specsRoot`, which no spec owns,
 * and the ids they name travel in `refs` — a field `isFindingInSpecScope` does
 * not read. Every one of them therefore survived `--spec`, so a slice worker
 * gating on its own spec failed on a sibling agent's in-flight `spec-NNNN/`
 * from the moment that directory appeared until its CAP row landed. Listing the
 * implicated directories under `relatedFiles` lets the scope filter derive the
 * owners, the representative-plus-`relatedFiles` shape `QFAI-ID-001` uses.
 *
 * `known` maps a lower-cased id to *every* directory `collectSpecEntries`
 * enumerated under it, so a `SPEC-0004/` spelling on a case-sensitive
 * filesystem keeps its real path — and a `spec-0001/` that coexists with a
 * `SPEC-0001/` contributes both, since either one alone would name only half of
 * what the count finding is about. A missing spec has no entry and its path is
 * synthesised: the finding is then owned by a directory that does not exist
 * yet, which is precisely the spec whose run has to see it.
 */
function specDirPaths(
  specsRoot: string,
  specIds: readonly string[],
  known: ReadonlyMap<string, readonly string[]>,
): string[] {
  return specIds.flatMap((specId) => known.get(specId) ?? [path.join(specsRoot, specId)]);
}

export async function validateSpecSplitByCapability(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries
    .filter(
      (entry): entry is SpecEntry =>
        entry.layout === "layered" &&
        (entry.layeredStyle === "v1417" || entry.layeredStyle === "v1421"),
    )
    .sort((left, right) => left.specNumber.localeCompare(right.specNumber));
  if (layeredEntries.length === 0) {
    return [];
  }

  const policiesDir = layeredEntries[0]?.sharedDir ?? path.join(specsRoot, "_policies");
  const capabilitiesPath = path.join(policiesDir, "03_Capabilities.md");
  const capabilityText = await readSafe(capabilitiesPath);
  // Fenced examples, HTML-commented predecessors and indented samples are not
  // the catalog. Both readers below mask the same *raw* text, each exactly
  // once — the roll-call inside `extractCatalogCapIds`, the declared mapping
  // through `maskedCapabilityText` — so they see one and the same document and
  // a CAP that exists only in a comment is neither counted nor demanded of the
  // catalog. Masking an already-masked string is not a no-op: a fenced block
  // collapses to blank lines, which can make the line after it look like the
  // start of an indented code block and blank it too.
  const maskedCapabilityText = maskNonSpecRegions(capabilityText);
  const issues: Issue[] = [];

  if (!(await exists(capabilitiesPath))) {
    issues.push(
      issue(
        "QFAI-SPLIT-100",
        "_policies/03_Capabilities.md が見つかりません。",
        "error",
        capabilitiesPath,
        "specSplitByCapability.capabilitiesFile",
      ),
    );
    return issues;
  }

  const capIds = extractCatalogCapIds(capabilityText);
  if (capIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-101",
        "_policies/03_Capabilities.md に CAP ID が見つかりません。",
        "error",
        capabilitiesPath,
        "specSplitByCapability.capabilitiesIds",
      ),
    );
    return issues;
  }

  // `SPEC_DIR_RE` is case-insensitive, so on a case-sensitive filesystem
  // `spec-0001/` and `SPEC-0001/` are two entries under one normalised id.
  // Keeping only the last one would lose the very directory that makes
  // `layeredEntries.length` disagree with `capIds.length`.
  const specDirsById = new Map<string, string[]>();
  for (const entry of layeredEntries) {
    const specId = path.basename(entry.dir).toLowerCase();
    const dirs = specDirsById.get(specId);
    if (dirs === undefined) {
      specDirsById.set(specId, [entry.dir]);
    } else {
      dirs.push(entry.dir);
    }
  }

  // The catalog may declare the CAP -> spec directory pairing explicitly. When
  // it does, that declaration is the SSOT and ID gaps left by an approved
  // DELETE stay legal; otherwise the pairing stays positional.
  const catalog = parseDeclaredCatalog(maskedCapabilityText);
  const unresolved = catalog ? unresolvedCapIds(catalog, capIds) : [];
  // Declared mode never synthesises a directory for a blank cell: that row is
  // already reported as QFAI-SPLIT-106, and inventing `spec-<row number>` for
  // it would raise a 103 for a directory nobody asked for.
  const expectedSpecIds: (string | null)[] = capIds.map((capId, index) =>
    catalog ? (catalog.byCap.get(capId) ?? null) : `spec-${to4(index + 1)}`,
  );

  const missingSpecIds = expectedSpecIds.filter(
    (specId): specId is string => specId !== null && !specDirsById.has(specId),
  );
  // While a CAP row is still unresolved — blank cell, or several directories in
  // one cell — an unnamed directory may well be the one that row owns, so 104
  // ("no CAP owns this directory") cannot be trusted until 106 is cleared.
  const extraSpecIds =
    unresolved.length > 0
      ? []
      : Array.from(specDirsById.keys()).filter((specId) => !expectedSpecIds.includes(specId));
  // An id held by several real directories is neither missing nor extra, yet it
  // is exactly what the count finding reports. Without it a duplicate-only
  // mismatch would leave `relatedFiles` empty, and `isFindingInSpecScope` reads
  // an unattributed finding as belonging to every `--spec` scope — the sibling
  // gate failure this attribution exists to stop.
  const duplicatedSpecIds = Array.from(specDirsById.entries())
    .filter(([, dirs]) => dirs.length > 1)
    .map(([specId]) => specId);
  const countSpecIds = Array.from(
    new Set([...missingSpecIds, ...extraSpecIds, ...duplicatedSpecIds]),
  );

  if (capIds.length !== layeredEntries.length) {
    issues.push(
      issue(
        "QFAI-SPLIT-102",
        `CAP件数と spec件数が一致しません (CAP=${capIds.length}, spec=${layeredEntries.length})`,
        "error",
        specsRoot,
        "specSplitByCapability.count",
        undefined,
        "canonical",
        undefined,
        {
          relatedFiles: specDirPaths(specsRoot, countSpecIds, specDirsById),
        },
      ),
    );
  }

  if (catalog) {
    issues.push(...declaredMappingIssues(catalog, capIds, capabilitiesPath));
  }

  if (missingSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-103",
        `CAPに対応する spec ディレクトリが不足しています: ${missingSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        missingSpecIds,
        "canonical",
        undefined,
        { relatedFiles: specDirPaths(specsRoot, missingSpecIds, specDirsById) },
      ),
    );
  }

  if (extraSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-104",
        `CAPに対応しない spec ディレクトリがあります: ${extraSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        extraSpecIds,
        "canonical",
        undefined,
        { relatedFiles: specDirPaths(specsRoot, extraSpecIds, specDirsById) },
      ),
    );
  }

  issues.push(...(await capReferenceIssues(capIds, expectedSpecIds, layeredEntries)));

  return issues;
}
