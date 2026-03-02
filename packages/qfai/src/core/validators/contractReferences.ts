import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

const FULL_CONTRACT_ID_RE = /\bCON-(API|DB|UI)-(\d+)\b/gi;
const SHORT_CONTRACT_ID_RE = /(?<!CON-)\b(API|DB|UI)-(\d{1,4})\b/gi;
const CONTRACT_INDEX_HEADER_KEYS = new Set(["contractid", "declaredid", "shortid"]);

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
  for (const filePath of Array.from(contractIndexFiles).sort((a, b) => a.localeCompare(b))) {
    const text = await readSafe(filePath);
    if (text.trim().length === 0) {
      continue;
    }

    const referencedIds = extractContractIds(text);
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
          "compatibility",
          "契約IDに対応するファイルを `.qfai/contracts/**` に追加し、`QFAI-CONTRACT-ID` 宣言を一致させてください。",
        ),
      );
    }
  }

  return issues;
}

function extractContractIds(text: string): string[] {
  const ids = new Set<string>();
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

    const headerColumns = parseTableRow(headerLine);
    const targetColumnIndexes = headerColumns
      .map((column, columnIndex) => ({
        columnKey: normalizeHeaderKey(column),
        columnIndex,
      }))
      .filter((column) => CONTRACT_INDEX_HEADER_KEYS.has(column.columnKey))
      .map((column) => column.columnIndex);

    if (targetColumnIndexes.length === 0) {
      continue;
    }

    lineIndex += 2;
    while (lineIndex < lines.length) {
      const rowLine = lines[lineIndex];
      if (rowLine === undefined || !isTableRow(rowLine)) {
        break;
      }
      if (isSeparatorRow(rowLine)) {
        lineIndex++;
        continue;
      }

      const rowColumns = parseTableRow(rowLine);
      for (const columnIndex of targetColumnIndexes) {
        const cell = rowColumns[columnIndex];
        if (!cell) {
          continue;
        }
        extractCellContractIds(cell, ids);
      }
      lineIndex++;
    }
    lineIndex--;
  }

  return Array.from(ids).sort((a, b) => a.localeCompare(b));
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
