import { access, readFile } from "node:fs/promises";
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
  collectDbContractFiles,
  collectUiContractFiles,
  collectThemaContractFiles,
} from "../discovery.js";
import { extractInvalidIds } from "../ids.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

const SQL_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
    label: "ALTER TABLE ... DROP",
  },
];
const THEMA_ID_RE = /^THEMA-\d{3}$/;

export async function validateContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const contractIndex = await buildContractIndex(root, config);
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const themaIds = new Set(
    Array.from(contractIndex.ids).filter((id) => id.startsWith("THEMA-")),
  );

  issues.push(...(await validateUiContracts(uiRoot, themaIds)));
  issues.push(...(await validateThemaContracts(uiRoot)));
  issues.push(...(await validateApiContracts(path.join(contractsRoot, "api"))));
  issues.push(...(await validateDbContracts(path.join(contractsRoot, "db"))));
  issues.push(...validateDuplicateContractIds(contractIndex));

  return issues;
}

async function validateUiContracts(
  uiRoot: string,
  themaIds: Set<string>,
): Promise<Issue[]> {
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
    const declaredIds = extractDeclaredContractIds(text);
    issues.push(...validateDeclaredContractIds(declaredIds, file, "UI"));

    let doc: Record<string, unknown> | null = null;
    try {
      doc = parseStructuredContract(file, stripContractDeclarationLines(text));
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

    const invalidIds = extractInvalidIds(text, [
      "SPEC",
      "BR",
      "SC",
      "UI",
      "API",
      "DB",
      "THEMA",
      "ADR",
    ]).filter((id) => !shouldIgnoreInvalidId(id, doc));
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

    if (doc) {
      issues.push(
        ...(await validateUiContractDoc(doc, file, uiRoot, themaIds)),
      );
    }
  }

  return issues;
}

async function validateThemaContracts(uiRoot: string): Promise<Issue[]> {
  const files = await collectThemaContractFiles(uiRoot);
  if (files.length === 0) {
    return [];
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
      "THEMA",
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
    if (declaredIds.length === 0) {
      issues.push(
        issue(
          "QFAI-THEMA-010",
          `thema 契約ファイルに QFAI-CONTRACT-ID がありません: ${file}`,
          "error",
          file,
          "contracts.thema.declaration",
        ),
      );
      continue;
    }
    if (declaredIds.length > 1) {
      issues.push(
        issue(
          "QFAI-THEMA-011",
          `thema 契約ファイルに複数の QFAI-CONTRACT-ID が宣言されています: ${declaredIds.join(
            ", ",
          )}`,
          "error",
          file,
          "contracts.thema.declaration",
          declaredIds,
        ),
      );
      continue;
    }

    const declaredId = declaredIds[0] ?? "";
    if (!THEMA_ID_RE.test(declaredId)) {
      issues.push(
        issue(
          "QFAI-THEMA-012",
          `thema 契約ファイルの ID 形式が不正です: ${declaredId}`,
          "error",
          file,
          "contracts.thema.idFormat",
          [declaredId],
        ),
      );
    }

    let doc: Record<string, unknown>;
    try {
      doc = parseStructuredContract(file, stripContractDeclarationLines(text));
    } catch (error) {
      issues.push(
        issue(
          "QFAI-THEMA-001",
          `thema 契約ファイルの解析に失敗しました: ${file} (${formatError(error)})`,
          "error",
          file,
          "contracts.thema.parse",
        ),
      );
      continue;
    }

    const docId = typeof doc.id === "string" ? doc.id : "";
    if (!THEMA_ID_RE.test(docId)) {
      issues.push(
        issue(
          "QFAI-THEMA-012",
          docId.length > 0
            ? `thema の id 形式が不正です: ${docId}`
            : "thema の id が見つかりません。",
          "error",
          file,
          "contracts.thema.idFormat",
          docId.length > 0 ? [docId] : undefined,
        ),
      );
    }

    const name = typeof doc.name === "string" ? doc.name : "";
    if (!name) {
      issues.push(
        issue(
          "QFAI-THEMA-014",
          "thema の name が見つかりません。",
          "error",
          file,
          "contracts.thema.name",
        ),
      );
    }

    if (declaredId && docId && declaredId !== docId) {
      issues.push(
        issue(
          "QFAI-THEMA-013",
          `thema の宣言 ID と id が一致しません: ${declaredId} / ${docId}`,
          "error",
          file,
          "contracts.thema.idMismatch",
          [declaredId, docId],
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
      "THEMA",
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

async function validateDbContracts(dbRoot: string): Promise<Issue[]> {
  const files = await collectDbContractFiles(dbRoot);
  if (files.length === 0) {
    return [
      issue(
        "QFAI-DB-000",
        "DB 契約ファイルが見つかりません。",
        "info",
        dbRoot,
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
      "THEMA",
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

async function validateUiContractDoc(
  doc: Record<string, unknown>,
  file: string,
  uiRoot: string,
  themaIds: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  if (Object.prototype.hasOwnProperty.call(doc, "themaRef")) {
    const themaRef = doc.themaRef;
    if (typeof themaRef !== "string" || themaRef.length === 0) {
      issues.push(
        issue(
          "QFAI-UI-020",
          "themaRef は THEMA-001 形式の文字列で指定してください。",
          "error",
          file,
          "contracts.ui.themaRef",
        ),
      );
    } else if (!THEMA_ID_RE.test(themaRef)) {
      issues.push(
        issue(
          "QFAI-UI-020",
          `themaRef の形式が不正です: ${themaRef}`,
          "error",
          file,
          "contracts.ui.themaRef",
          [themaRef],
        ),
      );
    } else if (!themaIds.has(themaRef)) {
      issues.push(
        issue(
          "QFAI-UI-020",
          `themaRef が存在しない THEMA を参照しています: ${themaRef}`,
          "error",
          file,
          "contracts.ui.themaRef",
          [themaRef],
        ),
      );
    }
  }

  const assets = doc.assets;
  if (assets && typeof assets === "object") {
    issues.push(
      ...(await validateUiAssets(
        assets as Record<string, unknown>,
        file,
        uiRoot,
      )),
    );
  }

  return issues;
}

async function validateUiAssets(
  assets: Record<string, unknown>,
  file: string,
  uiRoot: string,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const packValue = assets.pack;
  const useValue = assets.use;

  if (packValue === undefined && useValue === undefined) {
    return issues;
  }

  if (typeof packValue !== "string" || packValue.length === 0) {
    issues.push(
      issue(
        "QFAI-ASSET-001",
        "assets.pack が見つかりません。",
        "error",
        file,
        "assets.pack",
      ),
    );
    return issues;
  }

  if (!isSafeRelativePath(packValue)) {
    issues.push(
      issue(
        "QFAI-ASSET-001",
        `assets.pack は ui/ 配下の相対パスのみ許可されます: ${packValue}`,
        "error",
        file,
        "assets.pack",
        [packValue],
      ),
    );
    return issues;
  }

  const packDir = path.resolve(uiRoot, packValue);
  const packRelative = path.relative(uiRoot, packDir);
  if (packRelative.startsWith("..") || path.isAbsolute(packRelative)) {
    issues.push(
      issue(
        "QFAI-ASSET-001",
        `assets.pack は ui/ 配下に限定してください: ${packValue}`,
        "error",
        file,
        "assets.pack",
        [packValue],
      ),
    );
    return issues;
  }

  if (!(await exists(packDir))) {
    issues.push(
      issue(
        "QFAI-ASSET-001",
        `assets.pack のディレクトリが存在しません: ${packValue}`,
        "error",
        file,
        "assets.pack",
        [packValue],
      ),
    );
    return issues;
  }

  const assetsYamlPath = path.join(packDir, "assets.yaml");
  if (!(await exists(assetsYamlPath))) {
    issues.push(
      issue(
        "QFAI-ASSET-002",
        `assets.yaml が見つかりません: ${assetsYamlPath}`,
        "error",
        assetsYamlPath,
        "assets.yaml",
      ),
    );
    return issues;
  }

  let manifest: Record<string, unknown>;
  try {
    const manifestText = await readFile(assetsYamlPath, "utf-8");
    manifest = parseStructuredContract(assetsYamlPath, manifestText);
  } catch (error) {
    issues.push(
      issue(
        "QFAI-ASSET-002",
        `assets.yaml の解析に失敗しました: ${assetsYamlPath} (${formatError(error)})`,
        "error",
        assetsYamlPath,
        "assets.yaml",
      ),
    );
    return issues;
  }

  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const itemIds = new Set<string>();
  const itemPaths: Array<{ id: string | undefined; path: string | undefined }> =
    [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : undefined;
    const pathValue = typeof record.path === "string" ? record.path : undefined;
    if (id) {
      itemIds.add(id);
    }
    itemPaths.push({ id, path: pathValue });
  }

  if (useValue !== undefined) {
    if (
      !Array.isArray(useValue) ||
      useValue.some((entry) => typeof entry !== "string")
    ) {
      issues.push(
        issue(
          "QFAI-ASSET-003",
          "assets.use は文字列配列で指定してください。",
          "error",
          file,
          "assets.use",
        ),
      );
    } else {
      const missing = useValue.filter((entry) => !itemIds.has(entry));
      if (missing.length > 0) {
        issues.push(
          issue(
            "QFAI-ASSET-003",
            `assets.use が assets.yaml に存在しません: ${missing.join(", ")}`,
            "error",
            file,
            "assets.use",
            missing,
          ),
        );
      }
    }
  }

  for (const entry of itemPaths) {
    if (!entry.path) {
      continue;
    }
    if (!isSafeRelativePath(entry.path)) {
      issues.push(
        issue(
          "QFAI-ASSET-004",
          `assets.yaml の path が不正です: ${entry.path}`,
          "error",
          assetsYamlPath,
          "assets.path",
          entry.id ? [entry.id] : [entry.path],
        ),
      );
      continue;
    }
    const assetPath = path.resolve(packDir, entry.path);
    const assetRelative = path.relative(packDir, assetPath);
    if (assetRelative.startsWith("..") || path.isAbsolute(assetRelative)) {
      issues.push(
        issue(
          "QFAI-ASSET-004",
          `assets.yaml の path が packDir を逸脱しています: ${entry.path}`,
          "error",
          assetsYamlPath,
          "assets.path",
          entry.id ? [entry.id] : [entry.path],
        ),
      );
      continue;
    }
    if (!(await exists(assetPath))) {
      issues.push(
        issue(
          "QFAI-ASSET-004",
          `assets.yaml の path が存在しません: ${entry.path}`,
          "error",
          assetsYamlPath,
          "assets.path",
          entry.id ? [entry.id] : [entry.path],
        ),
      );
    }
  }

  return issues;
}

function shouldIgnoreInvalidId(
  value: string,
  doc: Record<string, unknown> | null,
): boolean {
  if (!doc) {
    return false;
  }
  const assets = doc.assets;
  if (!assets || typeof assets !== "object") {
    return false;
  }
  const packValue = (assets as Record<string, unknown>).pack;
  if (typeof packValue !== "string" || packValue.length === 0) {
    return false;
  }
  const normalized = packValue.replace(/\\/g, "/");
  const basename = path.posix.basename(normalized);
  if (!basename) {
    return false;
  }
  return value.toLowerCase() === basename.toLowerCase();
}

function isSafeRelativePath(value: string): boolean {
  if (!value) {
    return false;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = value.replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(normalized)) {
    return false;
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) {
    return false;
  }
  return true;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
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
  category: IssueCategory = "compatibility",
  suggested_action?: string,
): Issue {
  const issue: Issue = {
    code,
    severity,
    category,
    message,
  };
  if (suggested_action) {
    issue.suggested_action = suggested_action;
  }
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
