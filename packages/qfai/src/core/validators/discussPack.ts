import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { findPacks, latestPack as selectLatestPack } from "../packLocator.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const TABLE_SEPARATOR_RE = /^\s*:?-{3,}:?\s*$/;
const PLACEHOLDER_VALUE_RE =
  /^(?:tbd|todo|n\/a|none|<[^>]+>|-+|\(placeholder\))$/i;

const REQUIRED_DISCUSS_FILES = [
  "01_Context.md",
  "02_Hearing.md",
  "03_Config-Hearing.md",
  "04_Deep-Dive.md",
  "05_OQ-Register.md",
  "06_OQ-Resolution-Log.md",
  "07_Deferred.md",
  "08_Review-Request.md",
  "09_delta.md",
] as const;

const OQ_REGISTER_REQUIRED_HEADERS = [
  "OQ-ID",
  "Disposition",
  "Gate",
  "Owner",
  "Rationale",
  "Options",
  "Next-Decision-Point",
  "Evidence",
] as const;

const DEFERRED_REQUIRED_HEADERS = [
  "OQ-ID",
  "Rationale",
  "Owner",
  "Options",
  "Next-Decision-Point",
  "Impact",
  "Mitigation",
  "Evidence",
] as const;

type TableRow = Record<string, string>;

export async function validateDiscussPack(root: string): Promise<Issue[]> {
  const discussRoot = path.join(root, ".qfai", "discuss");
  const issues: Issue[] = [];

  const packs = await findPacks(discussRoot, "discuss");
  if (packs.length === 0) {
    return issues;
  }

  const invalidTimestampDirs = packs
    .filter((pack) => pack.isDangerous)
    .map((pack) => pack.name);
  for (const invalidDir of invalidTimestampDirs) {
    issues.push(
      issue(
        "QFAI-DISCUSS-023",
        `discuss ディレクトリ命名が不正です: ${invalidDir}`,
        "error",
        path.join(discussRoot, invalidDir),
        "discussPack.naming",
        [invalidDir],
        "change",
        "新規 discuss 成果物は discuss-YYYYMMDDhhmmssSSS 形式で作成してください。",
      ),
    );
  }

  const legacyPacks = packs
    .filter((pack) => pack.isLegacy)
    .map((pack) => pack.name)
    .sort((left, right) => left.localeCompare(right));
  if (legacyPacks.length > 0) {
    issues.push(
      issue(
        "QFAI-DISCUSS-028",
        `legacy discuss pack を検出しました（v1.4.24 は warning）: ${legacyPacks.join(", ")}`,
        "warning",
        discussRoot,
        "discussPack.legacy",
        legacyPacks,
        "change",
        "legacy 連番 pack は `discuss-legacy-*` へ退避するか削除し、timestamp pack へ移行してください。",
      ),
    );
  }

  const latestPack = selectLatestPack(packs);
  if (!latestPack) {
    return issues;
  }
  const latestPackDir = latestPack.path;
  const missingFiles: string[] = [];
  for (const fileName of REQUIRED_DISCUSS_FILES) {
    if (!(await isFile(path.join(latestPackDir, fileName)))) {
      missingFiles.push(fileName);
    }
  }
  if (missingFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-DISCUSS-024",
        `latest discuss pack の必須ファイルが不足しています: ${missingFiles.join(", ")}`,
        "error",
        latestPackDir,
        "discussPack.requiredFiles",
        missingFiles,
        "change",
        "最新 discuss pack に 01_Context.md から 09_delta.md までの9ファイルを揃えてください。",
      ),
    );
  }

  const oqRegisterPath = path.join(latestPackDir, "05_OQ-Register.md");
  const deferredPath = path.join(latestPackDir, "07_Deferred.md");

  const registerText = await readSafe(oqRegisterPath);
  const registerRows =
    registerText === null
      ? []
      : extractTableRows(registerText, OQ_REGISTER_REQUIRED_HEADERS);
  const openOqIds = registerRows
    .filter(
      (row) => normalizeValue(getTableCell(row, "Disposition")) === "open",
    )
    .map((row) => normalizeOqId(getTableCell(row, "OQ-ID")))
    .filter((id) => id.length > 0);
  const deferredFromRegister = registerRows
    .filter(
      (row) => normalizeValue(getTableCell(row, "Disposition")) === "deferred",
    )
    .map((row) => normalizeOqId(getTableCell(row, "OQ-ID")))
    .filter((id) => id.length > 0);

  if (openOqIds.length > 0) {
    issues.push(
      issue(
        "QFAI-DISCUSS-025",
        `05_OQ-Register.md に open OQ が残っています: ${openOqIds.join(", ")}`,
        "error",
        oqRegisterPath,
        "discussPack.openOq",
        openOqIds,
        "change",
        "discuss 完了前に該当 OQ の Disposition を resolved|deferred|rejected に更新してください。",
      ),
    );
  }

  const deferredText = await readSafe(deferredPath);
  const deferredRows =
    deferredText === null
      ? []
      : extractTableRows(deferredText, DEFERRED_REQUIRED_HEADERS);
  const deferredSet = new Set(
    deferredRows
      .map((row) => normalizeOqId(getTableCell(row, "OQ-ID")))
      .filter((value) => value.length > 0),
  );
  const missingDeferredDetails: string[] = [];
  for (const row of deferredRows) {
    const oqId = normalizeOqId(getTableCell(row, "OQ-ID"));
    if (oqId.length === 0) {
      continue;
    }
    const missing = DEFERRED_REQUIRED_HEADERS.filter((header) =>
      isMissingRequiredValue(getTableCell(row, header)),
    );
    if (missing.length > 0) {
      missingDeferredDetails.push(`${oqId}(${missing.join(", ")})`);
    }
  }

  if (missingDeferredDetails.length > 0) {
    issues.push(
      issue(
        "QFAI-DISCUSS-026",
        `07_Deferred.md の必須メタが不足しています: ${missingDeferredDetails.join(", ")}`,
        "error",
        deferredPath,
        "discussPack.deferredMetadata",
        missingDeferredDetails,
        "change",
        "deferred 行には Rationale/Owner/Options/Next-Decision-Point/Impact/Mitigation/Evidence を全て記載してください。",
      ),
    );
  }

  const missingDeferredRows = deferredFromRegister.filter(
    (oqId) => !deferredSet.has(oqId),
  );
  if (missingDeferredRows.length > 0) {
    issues.push(
      issue(
        "QFAI-DISCUSS-027",
        `05_OQ-Register.md の deferred が 07_Deferred.md に存在しません: ${missingDeferredRows.join(", ")}`,
        "error",
        deferredPath,
        "discussPack.deferredCoverage",
        missingDeferredRows,
        "change",
        "OQ register で deferred にした OQ は 07_Deferred.md に同じ OQ-ID で記載してください。",
      ),
    );
  }

  return issues;
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

function extractTableRows(
  text: string,
  headers: readonly string[],
): TableRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!headerLine.includes("|")) {
      continue;
    }

    const parsedHeaders = parseTableRow(headerLine);
    if (parsedHeaders.length === 0) {
      continue;
    }
    const parsedNormalized = parsedHeaders.map((header) =>
      normalizeHeader(header),
    );
    const hasAllHeaders = normalizedHeaders.every((requiredHeader) =>
      parsedNormalized.includes(requiredHeader),
    );
    if (!hasAllHeaders) {
      continue;
    }

    const parsedSeparator = parseTableRow(separatorLine);
    if (
      parsedSeparator.length !== parsedHeaders.length ||
      parsedSeparator.some((cell) => !TABLE_SEPARATOR_RE.test(cell))
    ) {
      continue;
    }

    const rows: TableRow[] = [];
    for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] ?? "";
      if (!line.trim().startsWith("|")) {
        break;
      }
      const cells = parseTableRow(line);
      if (cells.length !== parsedHeaders.length) {
        continue;
      }
      const row: TableRow = {};
      for (const [cellIndex, headerName] of parsedHeaders.entries()) {
        const cellValue = cells[cellIndex] ?? "";
        row[headerName] = cellValue;
        row[normalizeHeader(headerName)] = cellValue;
      }
      rows.push(row);
    }

    return rows;
  }

  return [];
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return [];
  }
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeOqId(value: string | undefined): string {
  const match = /\bOQ-\d+\b/i.exec(value ?? "");
  return (match?.[0] ?? "").toUpperCase();
}

function isMissingRequiredValue(value: string | undefined): boolean {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    return true;
  }
  return PLACEHOLDER_VALUE_RE.test(normalized);
}

function getTableCell(row: TableRow, header: string): string | undefined {
  return row[header] ?? row[normalizeHeader(header)];
}
