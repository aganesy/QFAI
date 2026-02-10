import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  extractCaseSpecNumber,
  extractIds,
  extractInvalidIds,
  extractSpecNumber,
} from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const REQUIRED_CASE_COLUMNS = [
  ["case", "case番号"],
  ["targets", "対象"],
  ["preconditions", "前提"],
  ["action", "操作"],
  ["expected", "期待結果"],
] as const;

export async function validateCaseCatalogues(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    let specText = "";
    try {
      specText = await readFile(entry.specPath, "utf-8");
    } catch {
      specText = "";
    }
    const specParsed = specText ? parseSpec(specText, entry.specPath) : null;
    const specNumber = specParsed?.specId
      ? extractSpecNumber(specParsed.specId)
      : null;

    let text: string;
    try {
      text = await readFile(entry.caseCataloguePath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-CASE-001",
            "case-catalogue.md が見つかりません。",
            "error",
            entry.caseCataloguePath,
            "caseCatalogue.exists",
          ),
        );
        continue;
      }
      throw error;
    }

    if (!hasRequiredCaseTableHeader(text)) {
      issues.push(
        issue(
          "QFAI-CASE-011",
          "case-catalogue.md の表ヘッダに必須カラムが不足しています。",
          "error",
          entry.caseCataloguePath,
          "CASE-011",
          undefined,
          "change",
          "Case/case番号, 対象/Targets, 前提/Preconditions, 操作/Action, 期待結果/Expected を含む表ヘッダを追加してください。",
        ),
      );
    }

    const invalidIds = extractInvalidIds(text, ["CASE"]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          entry.caseCataloguePath,
          "id.format",
          invalidIds,
        ),
      );
    }

    if (specNumber) {
      const caseIds = extractIds(text, "CASE");
      const invalidCaseIds = caseIds.filter(
        (id) => extractCaseSpecNumber(id) !== specNumber,
      );
      if (invalidCaseIds.length > 0) {
        issues.push(
          issue(
            "QFAI-CASE-002",
            `CASE ID が SPEC と一致しません: ${invalidCaseIds.join(", ")}`,
            "error",
            entry.caseCataloguePath,
            "caseCatalogue.caseNamespace",
            invalidCaseIds,
          ),
        );
      }
    }
  }

  return issues;
}

function hasRequiredCaseTableHeader(text: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index] ?? "";
    if (!/^\s*\|/.test(line)) {
      continue;
    }
    const separatorLine = lines[index + 1] ?? "";
    if (!isTableSeparatorRow(separatorLine)) {
      continue;
    }

    const columns = line
      .split("|")
      .map((column) => normalizeHeaderCell(column))
      .filter((column) => column.length > 0);
    if (columns.length === 0) {
      continue;
    }

    const hasAllGroups = REQUIRED_CASE_COLUMNS.every((aliases) =>
      aliases.some((alias) => {
        const normalizedAlias = normalizeHeaderCell(alias);
        return columns.some(
          (column) =>
            column === normalizedAlias || column.includes(normalizedAlias),
        );
      }),
    );
    if (hasAllGroups) {
      return true;
    }
  }
  return false;
}

function normalizeHeaderCell(value: string): string {
  return value.toLowerCase().replace(/[\s\u3000]+/g, "");
}

function isTableSeparatorRow(line: string): boolean {
  if (!/^\s*\|/.test(line)) {
    return false;
  }

  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

  if (cells.length === 0) {
    return false;
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
