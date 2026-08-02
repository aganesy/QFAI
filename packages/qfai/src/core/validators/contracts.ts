import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex, type ContractIndex } from "../contractIndex.js";
import { extractDeclaredContractIds, stripContractDeclarationLines } from "../contractsDecl.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
} from "../discovery.js";
import type { Issue } from "../types.js";
import { validateContractConsistency } from "./contractConsistency.js";
import { issue } from "./utils.js";

const SQL_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
    label: "ALTER TABLE ... DROP",
  },
];

type ContractKind = "UI" | "API" | "DB";

export async function validateContracts(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const apiRoot = path.join(contractsRoot, "api");
  const dbRoot = path.join(contractsRoot, "db");

  const [uiFiles, apiFiles, dbFiles] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);

  if (uiFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "UI 契約ファイルが見つかりません。",
        "info",
        uiRoot,
        "contracts.ui.files",
      ),
    );
  }
  if (apiFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "API 契約ファイルが見つかりません。",
        "info",
        apiRoot,
        "contracts.api.files",
      ),
    );
  }
  if (dbFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "DB 契約ファイルが見つかりません。",
        "info",
        dbRoot,
        "contracts.db.files",
      ),
    );
  }

  for (const file of uiFiles) {
    issues.push(...(await validateContractFile(file, "UI")));
  }
  for (const file of apiFiles) {
    issues.push(...(await validateContractFile(file, "API")));
  }
  for (const file of dbFiles) {
    issues.push(...(await validateContractFile(file, "DB")));
  }

  const contractIndex = await buildContractIndex(root, config);
  issues.push(...validateDuplicateContractIds(contractIndex.idToFiles));
  issues.push(...validateDependencyRefs(contractIndex));

  issues.push(...(await validateContractConsistency(apiFiles, dbFiles)));

  return issues;
}

async function validateContractFile(file: string, kind: ContractKind): Promise<Issue[]> {
  const issues: Issue[] = [];
  const text = await readFile(file, "utf-8");
  const declaredIds = extractDeclaredContractIds(text);
  issues.push(...validateDeclaredContractIds(declaredIds, file, kind));

  if (kind === "DB") {
    issues.push(...lintSql(text, file));
    return issues;
  }

  try {
    const parsed = parseStructuredContract(file, stripContractDeclarationLines(text));
    if (kind === "API" && !hasOpenApi(parsed)) {
      issues.push(
        issue(
          "QFAI-CONTRACT-020",
          "API 契約ファイルに openapi 定義が見つかりません。",
          "error",
          file,
          "contracts.api.openapi",
        ),
      );
    }
  } catch (error) {
    issues.push(
      issue(
        "QFAI-CONTRACT-021",
        `${kind} 契約ファイルの解析に失敗しました: ${formatError(error)}`,
        "error",
        file,
        "contracts.parse",
      ),
    );
  }

  return issues;
}

export function lintSql(text: string, file: string): Issue[] {
  const issues: Issue[] = [];
  for (const { pattern, label } of SQL_DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(
        issue(
          "QFAI-DB-001",
          `危険な SQL 操作が含まれています: ${label}`,
          "warning",
          file,
          "contracts.db.sql",
        ),
      );
    }
  }
  return issues;
}

function validateDeclaredContractIds(ids: string[], file: string, kind: ContractKind): Issue[] {
  if (ids.length === 0) {
    return [
      issue(
        "QFAI-CONTRACT-010",
        "契約ファイルに QFAI-CONTRACT-ID がありません。",
        "error",
        file,
        "contracts.declaration",
      ),
    ];
  }

  if (ids.length > 1) {
    return [
      issue(
        "QFAI-CONTRACT-011",
        `契約ファイルに複数の QFAI-CONTRACT-ID が宣言されています: ${ids.join(", ")}`,
        "error",
        file,
        "contracts.declaration",
        ids,
      ),
    ];
  }

  const id = ids[0] ?? "";
  const expectedPrefix = `CON-${kind}-`;
  if (!id.startsWith(expectedPrefix)) {
    return [
      issue(
        "QFAI-CONTRACT-012",
        `契約ファイルの QFAI-CONTRACT-ID が ${expectedPrefix} で始まっていません: ${id}`,
        "error",
        file,
        "contracts.declarationPrefix",
        [id],
      ),
    ];
  }

  return [];
}

/**
 * Every declared apply-order dependency must name a contract that exists.
 *
 * `QFAI-CONTRACT-011` forces any schema larger than one table into N
 * cross-referencing files, and nothing checked that the references between them
 * resolve. Getting the set wrong is silent: the wrong subset still applies
 * cleanly and the tests still pass, against a schema missing the tables under
 * test. This is the cheap half of that — a dangling id is always wrong.
 */
function validateDependencyRefs(index: ContractIndex): Issue[] {
  const issues: Issue[] = [];
  for (const [id, dependencies] of index.idToDependencies) {
    const missing = Array.from(dependencies)
      .filter((dependency) => !index.ids.has(dependency))
      .sort();
    if (missing.length === 0) continue;
    const file = Array.from(index.idToFiles.get(id) ?? [])[0] ?? id;
    issues.push(
      issue(
        "QFAI-CONTRACT-014",
        `${id} が宣言している依存先の契約が存在しません: ${missing.join(", ")}`,
        "error",
        file,
        "contracts.dependencyRefs",
        missing,
        "change",
        "`Depends on:` / `x-qfai-depends-on` に記載した契約 ID を実在するものに直すか、該当契約を追加してください。",
      ),
    );
  }
  return issues;
}

function validateDuplicateContractIds(idToFiles: Map<string, Set<string>>): Issue[] {
  const issues: Issue[] = [];
  for (const [id, files] of idToFiles.entries()) {
    if (files.size <= 1) {
      continue;
    }
    const sorted = Array.from(files).sort((a, b) => a.localeCompare(b));
    issues.push(
      issue(
        "QFAI-CONTRACT-013",
        `契約 ID が重複しています: ${id} (${sorted.join(", ")})`,
        "error",
        sorted[0],
        "contracts.idDuplicate",
        [id, ...sorted],
      ),
    );
  }
  return issues;
}

function hasOpenApi(doc: Record<string, unknown>): boolean {
  return typeof doc.openapi === "string" && doc.openapi.length > 0;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
