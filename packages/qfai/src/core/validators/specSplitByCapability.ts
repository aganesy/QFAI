import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { looksLikeTableRow, maskNonSpecRegions, splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
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
  // Fenced examples, HTML-commented predecessors and indented samples are not
  // the catalog. Masking once — line count preserved — keeps the CAP roll-call
  // and the declared mapping reading the very same document: were only one of
  // them masked, a CAP that exists solely in a comment would be demanded of a
  // catalog that never lists it.
  const capabilityText = maskNonSpecRegions(await readSafe(capabilitiesPath));
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

  const capIds = uniqueMatches(capabilityText, CAP_ID_RE);
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

  if (capIds.length !== layeredEntries.length) {
    issues.push(
      issue(
        "QFAI-SPLIT-102",
        `CAP件数と spec件数が一致しません (CAP=${capIds.length}, spec=${layeredEntries.length})`,
        "error",
        specsRoot,
        "specSplitByCapability.count",
      ),
    );
  }

  const actualSpecIds = new Set(
    layeredEntries.map((entry) => path.basename(entry.dir).toLowerCase()),
  );
  // The catalog may declare the CAP -> spec directory pairing explicitly. When
  // it does, that declaration is the SSOT and ID gaps left by an approved
  // DELETE stay legal; otherwise the pairing stays positional.
  const catalog = parseDeclaredCatalog(capabilityText);
  const unresolved = catalog ? unresolvedCapIds(catalog, capIds) : [];
  if (catalog) {
    issues.push(...declaredMappingIssues(catalog, capIds, capabilitiesPath));
  }
  // Declared mode never synthesises a directory for a blank cell: that row is
  // already reported as QFAI-SPLIT-106, and inventing `spec-<row number>` for
  // it would raise a 103 for a directory nobody asked for.
  const expectedSpecIds: (string | null)[] = capIds.map((capId, index) =>
    catalog ? (catalog.byCap.get(capId) ?? null) : `spec-${to4(index + 1)}`,
  );

  const missingSpecIds = expectedSpecIds.filter(
    (specId): specId is string => specId !== null && !actualSpecIds.has(specId),
  );
  if (missingSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-103",
        `CAPに対応する spec ディレクトリが不足しています: ${missingSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        missingSpecIds,
      ),
    );
  }

  // While a CAP row is still unresolved — blank cell, or several directories in
  // one cell — an unnamed directory may well be the one that row owns, so 104
  // ("no CAP owns this directory") cannot be trusted until 106 is cleared.
  const extraSpecIds =
    unresolved.length > 0
      ? []
      : Array.from(actualSpecIds).filter((specId) => !expectedSpecIds.includes(specId));
  if (extraSpecIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-104",
        `CAPに対応しない spec ディレクトリがあります: ${extraSpecIds.join(", ")}`,
        "error",
        specsRoot,
        "specSplitByCapability.specCount",
        extraSpecIds,
      ),
    );
  }

  issues.push(...(await capReferenceIssues(capIds, expectedSpecIds, layeredEntries)));

  return issues;
}
