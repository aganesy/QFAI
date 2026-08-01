import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex } from "../contractIndex.js";
import { extractDeclaredContractIds, stripContractDeclarationLines } from "../contractsDecl.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
} from "../discovery.js";
import { collectCreatedObjects, findRedefinitions, parseSqlContract } from "../sqlContract.js";
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
    // A `.sql` contract used to return here, which is what made it the only
    // contract kind qfai never parsed — the `QFAI-CONTRACT-021` block below is
    // unreachable from this branch. DB gets its own structural lane instead of
    // no lane at all: the executable contract kind is now held to the same
    // "does it parse" bar as the declarative ones.
    issues.push(...validateSqlStructure(text, file));
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

/**
 * The structural lane for `.sql` contracts.
 *
 * Scope is **apply-ability, not semantic correctness**: whether the file could
 * be handed to a database at all, and whether it contradicts itself about what
 * it defines. It does not type-check a query or resolve a column, and the
 * shipped catalog note says so, so the gate's promise stays honest.
 */
export function validateSqlStructure(text: string, file: string): Issue[] {
  const issues: Issue[] = [];
  const { statements, errors } = parseSqlContract(text);

  for (const error of errors) {
    issues.push(
      issue(
        // Same rule id the UI/API lane uses for "this contract does not parse",
        // because it is the same claim about the same class of artifact.
        "QFAI-CONTRACT-021",
        `DB 契約ファイルの解析に失敗しました (${error.line} 行目): ${error.detail}`,
        "error",
        file,
        "contracts.parse",
        undefined,
        "change",
        "未終端の文字列 / コメント / ドル引用符、または閉じられていない括弧を修正してください。",
      ),
    );
  }

  for (const redefinition of findRedefinitions(collectCreatedObjects(statements))) {
    issues.push(
      issue(
        "QFAI-DB-002",
        `${redefinition.kind} "${redefinition.name}" は同一ファイル内で ${redefinition.lines.length} 回定義されています (${redefinition.lines.join(", ")} 行目)。最後の定義だけが有効になるため、それ以前の定義は適用後の契約と食い違います`,
        "error",
        file,
        "contracts.db.redefinition",
        [redefinition.name],
        "change",
        "重複した CREATE を1つに統合するか、意図的に別オブジェクトである場合は名前を分けてください。",
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
