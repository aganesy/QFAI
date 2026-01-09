import { readFile } from "node:fs/promises";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { extractIds, extractInvalidIds } from "../ids.js";
import { parseSpec } from "../parse/spec.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

export async function validateSpecs(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    const expected = "spec-0001/spec.md";
    const legacy = "spec-001/spec.md";
    return [
      issue(
        "QFAI-SPEC-000",
        `Spec ファイルが見つかりません。配置場所: ${config.paths.specsDir} / 期待パターン: ${expected} (${legacy} は非対応)`,
        "info",
        specsRoot,
        "spec.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    let text: string;
    try {
      text = await readFile(entry.specPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-SPEC-005",
            "spec.md が見つかりません。",
            "error",
            entry.specPath,
            "spec.exists",
          ),
        );
        continue;
      }
      throw error;
    }
    issues.push(
      ...validateSpecContent(
        text,
        entry.specPath,
        config.validation.require.specSections,
      ),
    );
  }

  return issues;
}

export function validateSpecContent(
  text: string,
  file: string,
  requiredSections: string[],
): Issue[] {
  const issues: Issue[] = [];

  const parsed = parseSpec(text, file);

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

  if (!parsed.specId) {
    issues.push(
      issue(
        "QFAI-SPEC-001",
        "SPEC ID が見つかりません。",
        "error",
        file,
        "spec.id",
      ),
    );
  }

  if (parsed.brs.length === 0) {
    issues.push(
      issue(
        "QFAI-SPEC-002",
        "BR ID が見つかりません。",
        "error",
        file,
        "spec.br",
      ),
    );
  }

  for (const br of parsed.brsWithoutPriority) {
    issues.push(
      issue(
        "QFAI-BR-001",
        `BR 行に Priority がありません: ${br.id}`,
        "error",
        file,
        "spec.brPriority",
        [br.id],
      ),
    );
  }

  for (const br of parsed.brsWithInvalidPriority) {
    issues.push(
      issue(
        "QFAI-BR-002",
        `BR Priority が不正です: ${br.id} (${br.priority})`,
        "error",
        file,
        "spec.brPriority",
        [br.id],
      ),
    );
  }

  const scIds = extractIds(text, "SC");
  if (scIds.length > 0) {
    issues.push(
      issue(
        "QFAI-SPEC-003",
        "Spec は SC を参照しないルールです。",
        "warning",
        file,
        "spec.noSc",
        scIds,
      ),
    );
  }

  for (const section of requiredSections) {
    if (!parsed.sections.has(section)) {
      issues.push(
        issue(
          "QFAI-SPEC-004",
          `必須セクションが不足しています: ${section}`,
          "error",
          file,
          "spec.requiredSection",
        ),
      );
    }
  }

  return issues;
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

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
}
