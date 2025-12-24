import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { loadConfig, resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";

const SQL_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
    label: "ALTER TABLE ... DROP",
  },
];

export async function validateContracts(root: string): Promise<Issue[]> {
  const config = await loadConfig(root);
  const issues: Issue[] = [];

  issues.push(
    ...(await validateUiContracts(resolvePath(root, config, "uiContractsDir"))),
  );
  issues.push(
    ...(await validateApiContracts(
      resolvePath(root, config, "apiContractsDir"),
    )),
  );
  issues.push(
    ...(await validateDataContracts(
      resolvePath(root, config, "dataContractsDir"),
    )),
  );

  return issues;
}

async function validateUiContracts(uiRoot: string): Promise<Issue[]> {
  const files = await collectFiles(uiRoot, { extensions: [".yaml", ".yml"] });
  if (files.length === 0) {
    return [issue("QFAI-UI-000", "UI 契約ファイルが見つかりません。", uiRoot)];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    try {
      const doc = parseYaml(text) as Record<string, unknown>;
      const id = typeof doc.id === "string" ? doc.id : "";
      if (!(id.startsWith("UI-") || id.startsWith("NAV-"))) {
        issues.push(
          issue(
            "QFAI-UI-001",
            "UI 契約の id は UI- または NAV- で始まる必要があります。",
            file,
          ),
        );
      }
    } catch (error) {
      issues.push(
        issue(
          "QFAI-UI-002",
          `UI YAML の解析に失敗しました: ${formatError(error)}`,
          file,
        ),
      );
    }
  }

  return issues;
}

async function validateApiContracts(apiRoot: string): Promise<Issue[]> {
  const files = await collectFiles(apiRoot, {
    extensions: [".yaml", ".yml", ".json"],
  });
  if (files.length === 0) {
    return [
      issue("QFAI-API-000", "API 契約ファイルが見つかりません。", apiRoot),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    try {
      const doc = parseStructured(file, text);
      if (!doc || !hasOpenApi(doc)) {
        issues.push(
          issue("QFAI-API-001", "OpenAPI 定義が見つかりません。", file),
        );
      }
    } catch (error) {
      issues.push(
        issue(
          "QFAI-API-002",
          `API 定義の解析に失敗しました: ${formatError(error)}`,
          file,
        ),
      );
    }
  }

  return issues;
}

async function validateDataContracts(dataRoot: string): Promise<Issue[]> {
  const files = await collectFiles(dataRoot, { extensions: [".sql"] });
  if (files.length === 0) {
    return [
      issue("QFAI-DATA-000", "DATA 契約ファイルが見つかりません。", dataRoot),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
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
          "QFAI-DATA-001",
          `危険な SQL 操作が含まれています: ${label}`,
          file,
        ),
      );
    }
  }
  return issues;
}

function parseStructured(
  file: string,
  text: string,
): Record<string, unknown> | null {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".json") {
    return JSON.parse(text) as Record<string, unknown>;
  }
  return parseYaml(text) as Record<string, unknown>;
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
  file?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity: "warning",
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}
