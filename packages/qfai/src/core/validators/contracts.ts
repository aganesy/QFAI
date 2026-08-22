import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex, type ContractIndex } from "../contractIndex.js";
import {
  extractDeclaredContractIds,
  hasDependencyDeclaration,
  stripContractDeclarationLines,
} from "../contractsDecl.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
} from "../discovery.js";
import {
  collectCreatedObjects,
  findRedefinitions,
  parseSqlContract,
  type SqlParseError,
} from "../sqlContract.js";
import type { Issue } from "../types.js";
import { validateContractConsistency } from "./contractConsistency.js";
import { validateDbContractExecutability } from "./dbContractExecutability.js";
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
  issues.push(...(await validateDbContractExecutability(root, dbFiles)));

  return issues;
}

async function validateContractFile(file: string, kind: ContractKind): Promise<Issue[]> {
  const issues: Issue[] = [];
  const text = await readFile(file, "utf-8");
  const declaredIds = extractDeclaredContractIds(text);
  issues.push(...validateDeclaredContractIds(declaredIds, file, kind));
  issues.push(...validateDependencyDeclaration(text, declaredIds, file));

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

/** Japanese phrasing for each structural failure, so the message is one language. */
const SQL_PARSE_ERROR_JA: Record<SqlParseError["kind"], string> = {
  "unterminated-string": "文字列リテラル（または引用識別子）が閉じられていません",
  "unterminated-comment": "ブロックコメント /* が閉じられていません",
  "unterminated-dollar-quote": "ドル引用符で開かれた本体が閉じられていません",
  "unbalanced-parens": "閉じられていない括弧があります",
};

/**
 * The structural lane for `.sql` contracts.
 *
 * Scope is **apply-ability, not semantic correctness**: whether the file could
 * be handed to a database at all, and whether it contradicts itself about what
 * it defines. It does not type-check a query or resolve a column, and the
 * shipped catalog note says so, so the gate's promise stays honest.
 */
function validateSqlStructure(text: string, file: string): Issue[] {
  const issues: Issue[] = [];
  const { statements, errors } = parseSqlContract(text);

  for (const error of errors) {
    issues.push(
      issue(
        // Same rule id the UI/API lane uses for "this contract does not parse",
        // because it is the same claim about the same class of artifact.
        "QFAI-CONTRACT-021",
        `DB 契約ファイルの解析に失敗しました (${error.line} 行目): ${SQL_PARSE_ERROR_JA[error.kind]}`,
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

/**
 * A contract must state its apply order, even when the answer is "nothing".
 *
 * `QFAI-CONTRACT-014` only inspects dependencies that were already declared, so
 * a contract that declares none contributes no entry to `idToDependencies` and
 * the referential loop never reaches it — the very failure the rule was written
 * to prevent (an apply graph nobody stated) was the one case with no finding.
 * `-` is the explicit way to say "none", which is what the shipped rule's
 * `(or `-`)` already implied.
 *
 * `warning`, not `error`: an unstated apply order is a gap in the record, not a
 * contradiction in it, and existing contract sets predate the requirement.
 */
function validateDependencyDeclaration(text: string, ids: string[], file: string): Issue[] {
  // `QFAI-CONTRACT-010` / `-011` already own a file with no id or several; a
  // second finding on the same file would only dilute theirs.
  if (ids.length !== 1) {
    return [];
  }
  if (hasDependencyDeclaration(text, file)) {
    return [];
  }
  const id = ids[0] ?? "";
  return [
    issue(
      "QFAI-CONTRACT-015",
      `契約ファイルが適用順の依存関係を宣言していません: ${id}`,
      "warning",
      file,
      "contracts.dependencyDeclaration",
      [id],
      "change",
      "`.sql` には `-- Depends on: CON-DB-0002`、`.yaml` / `.json` には `x-qfai-depends-on: [CON-API-0002]` を追加してください。先に適用すべき契約が無い場合は `-` と明記します。",
    ),
  ];
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
