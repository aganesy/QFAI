import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import { isTableSeparator, looksLikeTableRow, splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe, to4, uniqueMatches } from "./utils.js";

const CAP_ID_RE = /\bCAP-\d{4}\b/g;
const CAP_CELL_RE = /^CAP-\d{4}$/;
const SPEC_CELL_RE = /^spec-\d{4}$/i;
const HEADER_CAP_CELL_RE = /cap\s*id/i;
const HEADER_SPEC_CELL_RE = /(^|[^a-z])spec([^a-z]|$)/i;

/** Stands in for the declared value in QFAI-SPLIT-106 when the cell is blank. */
const UNDECLARED_SPEC_CELL = "(未宣言)";

type CapSpecMismatch = {
  capId: string;
  declaredSpecId: string;
  derivedSpecId: string;
};

type DeclaredSpecColumn = {
  /** A CAP table carrying a `Spec` header was found at all. */
  present: boolean;
  /** CAP cell -> the raw `Spec` cell on that row, blank and malformed included. */
  cells: Map<string, string>;
};

/**
 * Reads the optional Spec column of the CAP catalogue table.
 *
 * The column is advisory: row position stays the truth the spec directory
 * names are derived from. Declaring it makes that truth visible and diffable,
 * so a row that moves can be named instead of the specs it re-points.
 *
 * Rows are split with the shared {@link splitMarkdownRow}, so a legitimate
 * escaped pipe inside Statement / Success metrics / Notes does not shift the
 * cell the Spec column is read from.
 *
 * Cells come back raw rather than filtered down to well-formed spec IDs: once
 * the header exists a blank or malformed cell is itself a finding, and dropping
 * it here would let an appended row declare nothing and still validate.
 */
function parseDeclaredSpecColumn(markdown: string): DeclaredSpecColumn {
  const cells = new Map<string, string>();
  let specColumn = -1;
  let present = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (!looksLikeTableRow(line) || isTableSeparator(line)) {
      continue;
    }
    const rowCells = splitMarkdownRow(line);

    const capCell = rowCells.find((cell) => CAP_CELL_RE.test(cell));
    if (!capCell) {
      if (rowCells.some((cell) => HEADER_CAP_CELL_RE.test(cell))) {
        specColumn = rowCells.findIndex((cell) => HEADER_SPEC_CELL_RE.test(cell));
        present = present || specColumn >= 0;
      }
      continue;
    }
    if (specColumn < 0) {
      continue;
    }
    cells.set(capCell, rowCells[specColumn] ?? "");
  }

  return { present, cells };
}

function normalizeDeclaredSpecCell(cell: string): string {
  if (SPEC_CELL_RE.test(cell)) {
    return cell.toLowerCase();
  }
  return cell.length === 0 ? UNDECLARED_SPEC_CELL : cell;
}

function collectCapSpecMismatches(capIds: string[], markdown: string): CapSpecMismatch[] {
  const { present, cells } = parseDeclaredSpecColumn(markdown);
  if (!present) {
    return [];
  }

  const mismatches: CapSpecMismatch[] = [];
  capIds.forEach((capId, index) => {
    const declaredCell = cells.get(capId);
    if (declaredCell === undefined) {
      // The CAP is named somewhere other than a row of the table that carries
      // the column (prose, an appendix table), so there is nothing to compare.
      return;
    }
    const derivedSpecId = `spec-${to4(index + 1)}`;
    const declaredSpecId = normalizeDeclaredSpecCell(declaredCell);
    if (declaredSpecId !== derivedSpecId) {
      mismatches.push({ capId, declaredSpecId, derivedSpecId });
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

  const mismatches = collectCapSpecMismatches(capIds, capabilityText);
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
  // 不一致行の 105 は 106 の派生 (宣言と行位置がずれている限り必ず立つ) なので、
  // 原因の行を埋めないよう抑止する。ただし抑止はその行に限る: spec ディレクトリの
  // 欠落・余剰 (103/104) と、不一致でない行の Parent 破損 (105) は行移動とは独立に
  // 起こりうるため、ここで打ち切ると利用者が再実行するまで見えなくなる。
  const mismatchedCapIds = new Set(mismatches.map((mismatch) => mismatch.capId));

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
    if (mismatchedCapIds.has(capId)) {
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
