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
const HEADER_SPEC_CELL_RE = /(^|[^a-z])spec([^a-z]|$)/i;

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
};

type CapCatalogue = {
  /** A confirmed CAP catalogue table carried a `Spec` header. */
  hasSpecColumn: boolean;
  /** Data rows of the confirmed CAP catalogue table(s), in table order. */
  rows: CapCatalogueRow[];
};

/**
 * Parses the CAP catalogue table(s) of `_policies/03_Capabilities.md`.
 *
 * Only a *confirmed* table is read: a header row is one whose next line is the
 * GFM separator, and the run of rows below it ends at the first line that is
 * not a table row. The document is masked with {@link maskNonSpecRegions}
 * first, so a fenced or HTML-commented sample table — the file illustrates its
 * own format — is not scanned as a real catalogue and cannot overwrite a row's
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
  const rows: CapCatalogueRow[] = [];
  let hasSpecColumn = false;
  let capColumn = -1;
  let specColumn = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!looksLikeTableRow(line)) {
      capColumn = -1;
      specColumn = -1;
      continue;
    }
    if (isTableSeparator(line)) {
      continue;
    }
    const cells = splitMarkdownRow(line);
    if (isTableSeparator(lines[index + 1] ?? "")) {
      capColumn = cells.findIndex((cell) => HEADER_CAP_CELL_RE.test(cell));
      specColumn = capColumn >= 0 ? cells.findIndex((cell) => HEADER_SPEC_CELL_RE.test(cell)) : -1;
      hasSpecColumn = hasSpecColumn || specColumn >= 0;
      continue;
    }
    if (capColumn < 0) {
      continue;
    }
    const [capId, ...extraCapIds] = uniqueMatches(cells[capColumn] ?? "", CAP_ID_RE);
    if (capId === undefined || extraCapIds.length > 0) {
      // Not a capability row: the CAP column names no ID, or names several so
      // the row cannot be attributed to one. Skipping keeps the numbering of
      // the rows that do name exactly one CAP intact.
      continue;
    }
    rows.push({ capId, specCell: specColumn >= 0 ? (cells[specColumn] ?? "") : "" });
  }

  return { hasSpecColumn, rows };
}

function normalizeDeclaredSpecCell(cell: string): string {
  if (SPEC_CELL_RE.test(cell)) {
    return cell.toLowerCase();
  }
  return cell.length === 0 ? UNDECLARED_SPEC_CELL : cell;
}

function collectCapSpecMismatches(catalogue: CapCatalogue): CapSpecMismatch[] {
  if (!catalogue.hasSpecColumn) {
    return [];
  }

  const mismatches: CapSpecMismatch[] = [];
  catalogue.rows.forEach((row, index) => {
    const derivedSpecId = `spec-${to4(index + 1)}`;
    const declaredSpecId = normalizeDeclaredSpecCell(row.specCell);
    if (declaredSpecId !== derivedSpecId) {
      mismatches.push({
        capId: row.capId,
        declaredSpecId,
        derivedSpecId,
        declaredIsSpecId: SPEC_CELL_RE.test(row.specCell),
      });
    }
  });
  return mismatches;
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
  const capIds =
    catalogue.rows.length > 0
      ? catalogue.rows.map((row) => row.capId)
      : uniqueMatches(capabilityText, CAP_ID_RE);
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

  const mismatches = collectCapSpecMismatches(catalogue);
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

  const actualSpecIds = new Set(
    layeredEntries.map((entry) => path.basename(entry.dir).toLowerCase()),
  );
  const expectedSpecIds = capIds.map((_, index) => `spec-${to4(index + 1)}`);

  const missingSpecIds = expectedSpecIds.filter((specId) => !actualSpecIds.has(specId));
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

  const extraSpecIds = Array.from(actualSpecIds).filter(
    (specId) => !expectedSpecIds.includes(specId),
  );
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

  for (let index = 0; index < capIds.length; index += 1) {
    const capId = capIds[index];
    if (!capId) {
      continue;
    }
    if (suppressedCapIds.has(capId)) {
      continue;
    }
    const specId = `spec-${to4(index + 1)}`;
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
