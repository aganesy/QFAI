import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex } from "../contractIndex.js";
import {
  extractDeclaredContractIds,
  stripContractDeclarationLines,
} from "../contractsDecl.js";
import {
  collectApiContractFiles,
  collectDataContractFiles,
  collectUiContractFiles,
} from "../discovery.js";
import { extractInvalidIds } from "../ids.js";
import type { Issue, IssueSeverity } from "../types.js";

const SQL_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
    label: "ALTER TABLE ... DROP",
  },
];

export async function validateContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const contractsRoot = resolvePath(root, config, "contractsDir");

  issues.push(...(await validateUiContracts(path.join(contractsRoot, "ui"))));
  issues.push(...(await validateApiContracts(path.join(contractsRoot, "api"))));
  issues.push(...(await validateDataContracts(path.join(contractsRoot, "db"))));
  const contractIndex = await buildContractIndex(root, config);
  issues.push(...validateDuplicateContractIds(contractIndex));

  return issues;
}

async function validateUiContracts(uiRoot: string): Promise<Issue[]> {
  const files = await collectUiContractFiles(uiRoot);
  if (files.length === 0) {
    return [
      issue(
        "QFAI-UI-000",
        "UI 契約ファイルが見つかりません。",
        "info",
        uiRoot,
        "contracts.ui.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const invalidIds = extractInvalidIds(text, [
      "SPEC",
      "BR",
      "SC",
      "UI",
      "API",
      "DB",
      "ADR",
    ]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          file,
          "id.format",
          invalidIds,
        ),
      );
    }
    const declaredIds = extractDeclaredContractIds(text);
    issues.push(...validateDeclaredContractIds(declaredIds, file, "UI"));
    try {
      parseStructuredContract(file, stripContractDeclarationLines(text));
    } catch (error) {
      issues.push(
        issue(
          "QFAI-CONTRACT-001",
          `UI 契約ファイルの解析に失敗しました: ${file} (${formatError(error)})`,
          "error",
          file,
          "contracts.ui.parse",
        ),
      );
    }
  }

  return issues;
}

async function validateApiContracts(apiRoot: string): Promise<Issue[]> {
  const files = await collectApiContractFiles(apiRoot);
  if (files.length === 0) {
    return [
      issue(
        "QFAI-API-000",
        "API 契約ファイルが見つかりません。",
        "info",
        apiRoot,
        "contracts.api.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const invalidIds = extractInvalidIds(text, [
      "SPEC",
      "BR",
      "SC",
      "UI",
      "API",
      "DB",
      "ADR",
    ]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          file,
          "id.format",
          invalidIds,
        ),
      );
    }
    const declaredIds = extractDeclaredContractIds(text);
    issues.push(...validateDeclaredContractIds(declaredIds, file, "API"));
    let doc: Record<string, unknown>;
    try {
      doc = parseStructuredContract(file, stripContractDeclarationLines(text));
    } catch (error) {
      issues.push(
        issue(
          "QFAI-CONTRACT-001",
          `API 契約ファイルの解析に失敗しました: ${file} (${formatError(error)})`,
          "error",
          file,
          "contracts.api.parse",
        ),
      );
      continue;
    }

    if (!hasOpenApi(doc)) {
      issues.push(
        issue(
          "QFAI-API-001",
          "OpenAPI 定義が見つかりません。",
          "error",
          file,
          "contracts.api.openapi",
        ),
      );
    }
  }

  return issues;
}

async function validateDataContracts(dataRoot: string): Promise<Issue[]> {
  const files = await collectDataContractFiles(dataRoot);
  if (files.length === 0) {
    return [
      issue(
        "QFAI-DB-000",
        "DB 契約ファイルが見つかりません。",
        "info",
        dataRoot,
        "contracts.db.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const invalidIds = extractInvalidIds(text, [
      "SPEC",
      "BR",
      "SC",
      "UI",
      "API",
      "DB",
      "ADR",
    ]);
    if (invalidIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-002",
          `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
          "error",
          file,
          "id.format",
          invalidIds,
        ),
      );
    }
    const declaredIds = extractDeclaredContractIds(text);
    issues.push(...validateDeclaredContractIds(declaredIds, file, "DB"));
    issues.push(...lintSql(text, file));
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

type ContractKind = "UI" | "API" | "DB";

function validateDeclaredContractIds(
  ids: string[],
  file: string,
  kind: ContractKind,
): Issue[] {
  const issues: Issue[] = [];
  if (ids.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-010",
        `契約ファイルに QFAI-CONTRACT-ID がありません: ${file}`,
        "error",
        file,
        "contracts.declaration",
      ),
    );
    return issues;
  }
  if (ids.length > 1) {
    issues.push(
      issue(
        "QFAI-CONTRACT-011",
        `契約ファイルに複数の QFAI-CONTRACT-ID が宣言されています: ${ids.join(
          ", ",
        )}`,
        "error",
        file,
        "contracts.declaration",
        ids,
      ),
    );
    return issues;
  }

  const [id] = ids;
  if (id && !id.startsWith(`${kind}-`)) {
    issues.push(
      issue(
        "QFAI-CONTRACT-013",
        `契約ファイルの QFAI-CONTRACT-ID が ${kind}- ではありません: ${id}`,
        "error",
        file,
        "contracts.declarationPrefix",
        [id],
      ),
    );
  }

  return issues;
}

function validateDuplicateContractIds(contractIndex: {
  idToFiles: Map<string, Set<string>>;
}): Issue[] {
  const issues: Issue[] = [];
  for (const [id, files] of contractIndex.idToFiles.entries()) {
    if (files.size <= 1) {
      continue;
    }
    const sortedFiles = Array.from(files).sort((a, b) => a.localeCompare(b));
    issues.push(
      issue(
        "QFAI-CONTRACT-012",
        `契約 ID が複数ファイルで宣言されています: ${id} (${sortedFiles.join(
          ", ",
        )})`,
        "error",
        sortedFiles[0],
        "contracts.idDuplicate",
        [id],
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

function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity,
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}
