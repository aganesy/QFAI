import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import {
  isTableSeparator,
  looksLikeTableRow,
  maskNonSpecRegions,
  splitMarkdownRow,
} from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
const SPEC_CELL_RE = /^spec-\d{4}$/i;
const HEADER_CAP_CELL_RE = /cap\s*id/i;
const CAP_HEADER_EXACT_RE = /^cap\s*id$/i;
const HEADER_SPEC_CELL_RE = /(^|[^a-z])spec([^a-z]|$)/i;
const SPEC_HEADER_EXACT_RE = /^spec$/i;
const ATX_HEADING_RE = /^ {0,3}(#{1,6})\s+/;
/**
 * The SSOT section heading, matched whole.
 *
 * Substring matching also accepted `## CAP Catalog Format` and
 * `## Not a CAP Catalog`. Either one placed above the real heading claimed the
 * window, which then ended at the real heading — and a window with no table in
 * it fell through to the document-wide scan, so the catalogue's own wrong
 * `Spec` values went unreported. A closed ATX sequence (`## CAP Catalog ##`) is
 * still the same heading.
 */
const CAP_CATALOG_HEADING_RE = /^ {0,3}(#{1,6})\s+cap\s+catalog(?:\s+#+)?\s*$/i;

/**
 * Marks a catalogue row as a tombstone for an approved DELETE.
 *
 * The slice policy leaves the number of a deleted spec unused, but row position
 * is the mapping, so a gap had no representation that validated: keeping the
 * row demanded a directory that is gone, and dropping the row pulled every
 * capability below it up one slot. A tombstone row keeps its position and maps
 * to no spec — its directory must be absent and its ID is never reused.
 *
 * Read from the CAP cell rather than from the `Spec` cell so a catalogue
 * without the optional `Spec` column can record a gap too.
 */
const RETIRED_CAP_CELL_RE = /\(\s*deleted\s*\)/i;

/** Stands in for the declared value in QFAI-SPLIT-106 when the cell is blank. */
const UNDECLARED_SPEC_CELL = "(未宣言)";

type CapSpecMismatch = {
  capId: string;
  declaredSpecId: string;
  derivedSpecId: string;
  /** The cell named a well-formed spec ID, i.e. it claims a row position. */
  declaredIsSpecId: boolean;
};

type CapCatalogueRow = {
  capId: string;
  /** The raw `Spec` cell on that row, blank and malformed included. */
  specCell: string;
  /**
   * The row is a tombstone: an approved DELETE removed the spec and the row
   * stays only to hold the number, so the capabilities below keep theirs.
   */
  retired: boolean;
};

/** A catalogue row with the spec ID its position in the table derives. */
type NumberedCapRow = CapCatalogueRow & { specId: string };

type CapCatalogue = {
  /**
   * A catalogue table was identified — header row, GFM separator, CAP column.
   * Distinct from `rows.length > 0`: a confirmed table with no capability row
   * is the SSOT saying the catalogue is empty, which `QFAI-SPLIT-101` is there
   * to report. Falling back to the document-wide scan there let a CAP quoted
   * in a history table or in prose stand in for the empty catalogue.
   */
  confirmed: boolean;
  /** A confirmed CAP catalogue table carried a `Spec` header. */
  hasSpecColumn: boolean;
  /** Data rows of the confirmed CAP catalogue table(s), in table order. */
  rows: CapCatalogueRow[];
  /** CAP cells naming several IDs, so no single row position can be attributed. */
  ambiguousRows: string[][];
  /**
   * Header spellings that named more than one column of the same table.
   *
   * Taking the first of them would validate an arbitrary column, so the column
   * resolves to none and the catalogue is reported instead.
   */
  duplicateHeaders: string[];
};

/**
 * The half-open line range the catalogue table is looked for in.
 *
 * The template makes `## CAP Catalog` the SSOT section, so the search is
 * confined to it: a second table elsewhere in the file — a history of retired
 * IDs, say, whose header also names a CAP column — would otherwise be read as
 * catalogue rows and inflate both the CAP count and the row positions. When no
 * such heading exists (an older or hand-rolled catalogue) the whole document
 * stands in, and the single-table rule below still keeps the trailing tables
 * out.
 */
function findCatalogueWindow(lines: string[]): { start: number; end: number } {
  for (let index = 0; index < lines.length; index += 1) {
    const heading = CAP_CATALOG_HEADING_RE.exec(lines[index] ?? "");
    if (heading === null) {
      continue;
    }
    const level = heading[1]?.length ?? 0;
    for (let end = index + 1; end < lines.length; end += 1) {
      const next = ATX_HEADING_RE.exec(lines[end] ?? "");
      if (next !== null && (next[1]?.length ?? 0) <= level) {
        return { start: index + 1, end };
      }
    }
    return { start: index + 1, end: lines.length };
  }
  return { start: 0, end: lines.length };
}

/**
 * Picks the column the row position is declared in.
 *
 * A header spelled exactly `Spec` wins outright, so a companion column such as
 * `Previous Spec` in a renumber-history table cannot take its place — matching
 * loosely and taking the first hit would validate the wrong cell in both
 * directions, passing a wrong canonical value and failing a right one. The
 * loose spelling (`Spec ID`, `対応 spec`) is honoured only when nothing matches
 * exactly and exactly one column is a candidate; an ambiguous header declares
 * no column at all rather than guessing one.
 */
function resolveSpecColumn(header: string[]): ColumnResolution {
  return resolveColumn(header, SPEC_HEADER_EXACT_RE, HEADER_SPEC_CELL_RE);
}

/**
 * Picks the column the row's own CAP ID is read from, by the same rule.
 *
 * A `Previous CAP ID` companion column ahead of the real one was chosen by the
 * loose match, and a blank companion column produced zero rows — which then
 * fell through to the document-wide scan and validated a catalogue whose `Spec`
 * cells were never read.
 */
function resolveCapColumn(header: string[]): ColumnResolution {
  return resolveColumn(header, CAP_HEADER_EXACT_RE, HEADER_CAP_CELL_RE);
}

type ColumnResolution = {
  /** The resolved column index, or -1 when no single column resolves. */
  index: number;
  /** The header spelling that named more than one column, else null. */
  duplicateHeader: string | null;
};

/**
 * An exact header spelling wins outright; the loose one is honoured only when
 * nothing matches exactly and exactly one column is a candidate. An ambiguous
 * header declares no column at all rather than guessing one.
 *
 * Uniqueness is required of the exact match too. Taking the first hit let a
 * table repeat a canonical name (`| CAP ID | Spec | Spec |`) and be validated
 * against whichever column came first, so a second column holding a different
 * value was never read at all. Such a header resolves to no column and is
 * handed back for reporting rather than guessed at.
 */
function resolveColumn(header: string[], exactRe: RegExp, looseRe: RegExp): ColumnResolution {
  const normalized = header.map((cell) => cell.replace(/[`*_]/g, "").trim());
  const exact = normalized.flatMap((cell, index) => (exactRe.test(cell) ? [index] : []));
  if (exact.length === 1) {
    return { index: exact[0] ?? -1, duplicateHeader: null };
  }
  if (exact.length > 1) {
    return { index: -1, duplicateHeader: normalized[exact[0] ?? 0] ?? "" };
  }
  const loose = normalized.flatMap((cell, index) => (looseRe.test(cell) ? [index] : []));
  return { index: loose.length === 1 ? (loose[0] ?? -1) : -1, duplicateHeader: null };
}

/**
 * Reads the data rows below a confirmed header, stopping at the first line
 * that is not a table row so the table's own end bounds the catalogue.
 */
function readCatalogueRows(
  lines: string[],
  window: { start: number; end: number },
  capColumn: number,
  specColumn: number,
): Pick<CapCatalogue, "rows" | "ambiguousRows"> {
  const rows: CapCatalogueRow[] = [];
  const ambiguousRows: string[][] = [];
  for (let index = window.start; index < window.end; index += 1) {
    const line = lines[index] ?? "";
    if (!looksLikeTableRow(line)) {
      break;
    }
    if (isTableSeparator(line)) {
      continue;
    }
    const cells = splitMarkdownRow(line);
    const capCell = cells[capColumn] ?? "";
    const [capId, ...extraCapIds] = uniqueMatches(capCell, CAP_ID_RE);
    if (extraCapIds.length > 0) {
      // Several IDs on one row: the row claims one position for two
      // capabilities, so it is kept out of the numbering below and reported
      // instead — swallowing it would leave a capability mapped to no spec
      // while every count still balanced.
      ambiguousRows.push(capId === undefined ? extraCapIds : [capId, ...extraCapIds]);
      continue;
    }
    if (capId === undefined) {
      // Not a capability row: the CAP column names no ID at all. Skipping keeps
      // the numbering of the rows that do name exactly one CAP intact.
      continue;
    }
    rows.push({
      capId,
      specCell: specColumn >= 0 ? (cells[specColumn] ?? "") : "",
      retired: RETIRED_CAP_CELL_RE.test(capCell),
    });
  }
  return { rows, ambiguousRows };
}

/**
 * Parses the CAP catalogue table of `_policies/03_Capabilities.md`.
 *
 * Only the *first confirmed* table inside {@link findCatalogueWindow} is read:
 * a header row is one whose next line is the GFM separator and whose cells name
 * a CAP column, and the run of rows below it ends at the first line that is not
 * a table row. The document is masked with {@link maskNonSpecRegions} first, so
 * a fenced or HTML-commented sample table — the file illustrates its own
 * format — is not scanned as a real catalogue and cannot overwrite a row's
 * cells with its example values.
 *
 * The CAP and `Spec` cells are read from the header's column indices rather
 * than by scanning the row, so a CAP ID quoted in Statement / Notes is not
 * mistaken for the row's own ID and cannot shift the order rows are numbered
 * in. Rows are split with the shared {@link splitMarkdownRow}, so a legitimate
 * escaped pipe inside a free-text cell does not shift the Spec column either.
 *
 * The CAP cell is matched by extraction, not by equality, so an ID decorated
 * the ordinary Markdown way (`` `CAP-0001` ``, `[CAP-0001](...)`) still
 * identifies its row instead of silently dropping out of the comparison.
 *
 * Spec cells come back raw rather than filtered down to well-formed spec IDs:
 * once the header exists a blank or malformed cell is itself a finding, and
 * dropping it here would let an appended row declare nothing and still
 * validate.
 */
function parseCapCatalogue(markdown: string): CapCatalogue {
  const lines = maskNonSpecRegions(markdown).split("\n");
  const window = findCatalogueWindow(lines);
  const duplicateHeaders: string[] = [];

  for (let index = window.start; index < window.end; index += 1) {
    const line = lines[index] ?? "";
    if (!looksLikeTableRow(line) || isTableSeparator(line)) {
      continue;
    }
    if (!isTableSeparator(lines[index + 1] ?? "")) {
      continue;
    }
    const header = splitMarkdownRow(line);
    const capColumn = resolveCapColumn(header);
    if (capColumn.duplicateHeader !== null) {
      duplicateHeaders.push(capColumn.duplicateHeader);
    }
    if (capColumn.index < 0) {
      continue;
    }
    const specColumn = resolveSpecColumn(header);
    if (specColumn.duplicateHeader !== null) {
      duplicateHeaders.push(specColumn.duplicateHeader);
    }
    return {
      confirmed: true,
      hasSpecColumn: specColumn.index >= 0,
      duplicateHeaders,
      ...readCatalogueRows(
        lines,
        { start: index + 2, end: window.end },
        capColumn.index,
        specColumn.index,
      ),
    };
  }

  return { confirmed: false, hasSpecColumn: false, rows: [], ambiguousRows: [], duplicateHeaders };
}

function normalizeDeclaredSpecCell(cell: string): string {
  if (SPEC_CELL_RE.test(cell)) {
    return cell.toLowerCase();
  }
  return cell.length === 0 ? UNDECLARED_SPEC_CELL : cell;
}

/**
 * A tombstone row declares the position it holds like any other row, so the
 * gap stays visible and diffable in the `Spec` column.
 */
function collectCapSpecMismatches(
  hasSpecColumn: boolean,
  rows: NumberedCapRow[],
): CapSpecMismatch[] {
  if (!hasSpecColumn) {
    return [];
  }

  const mismatches: CapSpecMismatch[] = [];
  for (const row of rows) {
    const declaredSpecId = normalizeDeclaredSpecCell(row.specCell);
    if (declaredSpecId !== row.specId) {
      mismatches.push({
        capId: row.capId,
        declaredSpecId,
        derivedSpecId: row.specId,
        declaredIsSpecId: SPEC_CELL_RE.test(row.specCell),
      });
    }
  }
  return mismatches;
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

  // Row order is the mapping, so it is taken from the catalogue table's data
  // rows rather than from first appearance in the document: a CAP quoted in an
  // earlier row's Statement / Notes would otherwise be numbered ahead of the
  // row that declares it and re-point every spec below. Only when no confirmed
  // catalogue table exists does the document-wide scan stand in, so a catalogue
  // that lists its CAPs in prose still reports 101 / 102 as before.
  const catalogue = parseCapCatalogue(capabilityText);

  // A repeated canonical header used to resolve to whichever column came
  // first, so the columns after it were never read and the catalogue passed
  // whatever they held.
  for (const header of Array.from(new Set(catalogue.duplicateHeaders))) {
    issues.push(
      issue(
        "QFAI-SPLIT-109",
        `_policies/03_Capabilities.md のカタログ表に同名の列が複数あります: ${header}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.duplicateHeader",
        [header],
      ),
    );
  }

  // A row whose CAP cell names several IDs was left out of the numbering, so
  // without this its capabilities map to no spec at all while the count, the
  // Spec column and every Parent still balance — and `validateOrphanProhibition`
  // collects both IDs from the document, so a US parented on one is accepted too.
  // Reported ahead of the zero-row check below: a catalogue whose rows are *all*
  // ambiguous has no numbered row, and returning on that first would reduce the
  // whole diagnosis to a bare "no CAP ID found".
  for (const ambiguousRow of catalogue.ambiguousRows) {
    issues.push(
      issue(
        "QFAI-SPLIT-108",
        `_policies/03_Capabilities.md の1行が複数の CAP ID を含んでいます: ${ambiguousRow.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.ambiguousCapRow",
        ambiguousRow,
      ),
    );
  }

  // The document-wide fallback scans the *masked* text, like the table search
  // above: a catalogue that lists its CAPs in prose still illustrates its own
  // format, and a fenced `- CAP-NNNN:` sample is documentation rather than a
  // declared capability.
  const rows: CapCatalogueRow[] = catalogue.confirmed
    ? catalogue.rows
    : uniqueMatches(maskNonSpecRegions(capabilityText), CAP_ID_RE).map((capId) => ({
        capId,
        specCell: "",
        retired: false,
      }));
  if (rows.length === 0) {
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

  // Every row holds a position, tombstones included — that is what keeps an
  // approved DELETE's gap from pulling the capabilities below it up one slot.
  // Only the live rows claim a spec directory.
  const numberedRows: NumberedCapRow[] = rows.map((row, index) => ({
    ...row,
    specId: `spec-${to4(index + 1)}`,
  }));
  const liveRows = numberedRows.filter((row) => !row.retired);

  // Row order is the mapping, so a CAP repeated on two rows claims two spec
  // directories at once. The count check below would then be satisfied by the
  // duplicate itself, and `validateDefinedIds` records a defining file as a set
  // so it cannot see a repeat inside one file either — the pair would pass in
  // silence. Reject it here, where the row positions are still in hand.
  // Tombstones count: a retired ID handed to a new capability is the same fault.
  const rowCapIds = numberedRows.map((row) => row.capId);
  const duplicateCapIds = Array.from(
    new Set(rowCapIds.filter((capId, index) => rowCapIds.indexOf(capId) !== index)),
  );
  if (duplicateCapIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPLIT-107",
        `_policies/03_Capabilities.md の CAP ID が重複しています: ${duplicateCapIds.join(", ")}`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.duplicateCapIds",
        duplicateCapIds,
      ),
    );
  }

  // `SPEC_DIR_RE` is case-insensitive, so on a case-sensitive filesystem
  // `spec-0001/` and `SPEC-0001/` are two entries under one normalised id.
  // Keeping only the last one would lose the very directory that makes
  // `layeredEntries.length` disagree with the live row count.
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
  // A tombstone's number is deliberately unused, so it is neither expected to
  // exist (103) nor tolerated if it survived the DELETE (104).
  const expectedSpecIds = liveRows.map((row) => row.specId);
  const missingSpecIds = expectedSpecIds.filter((specId) => !specDirsById.has(specId));
  const extraSpecIds = Array.from(specDirsById.keys()).filter(
    (specId) => !expectedSpecIds.includes(specId),
  );
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

  if (liveRows.length !== layeredEntries.length) {
    issues.push(
      issue(
        "QFAI-SPLIT-102",
        `CAP件数と spec件数が一致しません (CAP=${liveRows.length}, spec=${layeredEntries.length})`,
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

  const mismatches = collectCapSpecMismatches(catalogue.hasSpecColumn, numberedRows);
  for (const mismatch of mismatches) {
    issues.push(
      issue(
        "QFAI-SPLIT-106",
        `03_Capabilities.md の Spec 列が行位置と一致しません: ${mismatch.capId} (宣言=${mismatch.declaredSpecId}, 行位置=${mismatch.derivedSpecId})`,
        "error",
        capabilitiesPath,
        "specSplitByCapability.declaredSpec",
        [mismatch.capId, mismatch.declaredSpecId, mismatch.derivedSpecId],
      ),
    );
  }
  // 行が動いた行 (宣言セルが別の spec-NNNN を名指している行) の 105 は 106 の派生
  // なので、原因の行を埋めないよう抑止する。抑止はその行に限る: spec ディレクトリの
  // 欠落・余剰 (103/104) と、不一致でない行の Parent 破損 (105) は行移動とは独立に
  // 起こりうるため、ここで打ち切ると利用者が再実行するまで見えなくなる。
  // 宣言セルが空、または桁数違いなどで spec ID の形を成さない行は「別の行位置を
  // 主張していない」ので
  // 行移動の証拠にならない。その行の Parent 破損は 106 とは独立した欠陥なので
  // 抑止せず 105 を報告する。
  const suppressedCapIds = new Set(
    mismatches.filter((mismatch) => mismatch.declaredIsSpecId).map((mismatch) => mismatch.capId),
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

  for (const row of liveRows) {
    if (suppressedCapIds.has(row.capId)) {
      continue;
    }
    const entry = layeredEntries.find(
      (value) => path.basename(value.dir).toLowerCase() === row.specId,
    );
    if (!entry) {
      continue;
    }
    const specFilePath = path.join(entry.dir, "01_Spec.md");
    const specText = await readSafe(specFilePath);
    if (specText.trim().length === 0 || !specText.includes(row.capId)) {
      issues.push(
        issue(
          "QFAI-SPLIT-105",
          `01_Spec.md が CAP を参照していません: ${row.specId} -> ${row.capId}`,
          "error",
          specFilePath,
          "specSplitByCapability.specParent",
          [row.specId, row.capId],
        ),
      );
    }
  }

  return issues;
}
