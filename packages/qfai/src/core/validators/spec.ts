import { readFile } from "node:fs/promises";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecFiles } from "../discovery.js";
import { extractIds, extractInvalidIds } from "../ids.js";
import type { Issue, IssueSeverity } from "../types.js";

export async function validateSpecs(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specDir");
  const files = await collectSpecFiles(specsRoot);

  if (files.length === 0) {
    const expected = "spec-0001-<slug>.md";
    return [
      issue(
        "QFAI-SPEC-000",
        `Spec ファイルが見つかりません。配置場所: ${config.paths.specDir} / 期待パターン: ${expected}`,
        "info",
        specsRoot,
        "spec.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    issues.push(
      ...validateSpecContent(
        text,
        file,
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

  const invalidIds = extractInvalidIds(text, [
    "SPEC",
    "BR",
    "SC",
    "UI",
    "API",
    "DATA",
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

  const specIds = extractIds(text, "SPEC");
  if (specIds.length === 0) {
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

  const brIds = extractIds(text, "BR");
  if (brIds.length === 0) {
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
    if (!text.includes(section)) {
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
