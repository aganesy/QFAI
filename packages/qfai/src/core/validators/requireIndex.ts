import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { parseFirstMarkdownTable } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const REQ_ID_RE = /(?:^|[\s|`])(REQ-\d{4})(?=$|[\s|`])/g;
const REQ_ID_CELL_RE = /^REQ-\d{4}$/;

type SourceRefsCoverage =
  | { status: "ok" }
  | { status: "missing_column" }
  | { status: "too_many_missing"; missingCount: number; reqRowCount: number };

export async function validateRequireIndexShape(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const requireRoot = resolvePath(root, config, "requireDir");
  const markdownFiles = await collectFiles(requireRoot, {
    extensions: [".md"],
  });
  const indexFiles = markdownFiles.filter(
    (filePath) =>
      path.basename(filePath).toLowerCase() === "02_requirement-index.md",
  );
  const issues: Issue[] = [];

  for (const filePath of indexFiles) {
    const text = await readSafe(filePath);
    if (text.length === 0) {
      continue;
    }

    const reqCount = countReqCatalogRows(text);
    if (reqCount === 0) {
      issues.push(
        issue(
          "QFAI-REQINDEX-001",
          "02_requirement-index.md に REQ-XXXX が1件も見つかりません。",
          "warning",
          filePath,
          "require.index.reqCatalog",
          undefined,
          "change",
          "REQ Catalog に少なくとも1件の `REQ-XXXX` と statement/source refs を追加してください。",
        ),
      );
      continue;
    }

    const sourceRefsCoverage = assessSourceRefsCoverage(text);
    if (sourceRefsCoverage.status === "missing_column") {
      issues.push(
        issue(
          "QFAI-REQINDEX-002",
          "02_requirement-index.md の REQ Catalog に `Source refs` 列が見つかりません。",
          "warning",
          filePath,
          "require.index.sourceRefs",
          undefined,
          "change",
          "REQ Catalog に `Source refs` 列を追加し、各 REQ 行に出典参照を記録してください。",
        ),
      );
      continue;
    }

    if (sourceRefsCoverage.status === "too_many_missing") {
      issues.push(
        issue(
          "QFAI-REQINDEX-002",
          `02_requirement-index.md で Source refs が空の REQ 行が多すぎます (${sourceRefsCoverage.missingCount}/${sourceRefsCoverage.reqRowCount})。`,
          "warning",
          filePath,
          "require.index.sourceRefs",
          undefined,
          "change",
          "各 REQ 行に URL / ファイルパス / アンカーなどの `Source refs` を入力してください。",
        ),
      );
    }
  }

  return issues;
}

function assessSourceRefsCoverage(text: string): SourceRefsCoverage {
  const table = parseFirstMarkdownTable(text);
  if (!table) {
    return { status: "missing_column" };
  }

  const reqIdIndex = resolveReqIdIndex(table.headers);
  const sourceRefsIndex = table.headers.findIndex((header) =>
    isSourceRefsHeader(header),
  );
  if (sourceRefsIndex < 0) {
    return { status: "missing_column" };
  }

  const reqRows = table.rows.filter((row) => {
    if (reqIdIndex >= 0) {
      return isReqId(row[reqIdIndex] ?? "");
    }
    return row.some((cell) => isReqId(cell));
  });
  if (reqRows.length === 0) {
    return { status: "ok" };
  }

  const missingCount = reqRows.filter((row) => {
    const cell = row[sourceRefsIndex] ?? "";
    return cell.trim().length === 0;
  }).length;
  if (missingCount === 0) {
    return { status: "ok" };
  }
  if (missingCount * 2 < reqRows.length) {
    return { status: "ok" };
  }

  return {
    status: "too_many_missing",
    missingCount,
    reqRowCount: reqRows.length,
  };
}

function isSourceRefsHeader(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  return normalized.includes("source refs");
}

function countReqCatalogRows(text: string): number {
  const table = parseFirstMarkdownTable(text);
  if (table) {
    const reqIdIndex = resolveReqIdIndex(table.headers);
    if (reqIdIndex >= 0) {
      return table.rows.filter((row) => isReqId(row[reqIdIndex] ?? "")).length;
    }
    return table.rows.flatMap((row) => row.filter((cell) => isReqId(cell)))
      .length;
  }
  return countMatches(text, REQ_ID_RE);
}

function resolveReqIdIndex(headers: string[]): number {
  return headers.findIndex((header) => {
    const normalized = header
      .trim()
      .toLowerCase()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ");
    return (
      normalized.includes("req id") || normalized.includes("requirement id")
    );
  });
}

function isReqId(value: string): boolean {
  return REQ_ID_CELL_RE.test(value.trim());
}

function countMatches(text: string, pattern: RegExp): number {
  const matcher = new RegExp(pattern.source, pattern.flags);
  return Array.from(text.matchAll(matcher)).length;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
