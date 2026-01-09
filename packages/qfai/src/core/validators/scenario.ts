import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { extractInvalidIds } from "../ids.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseScenarioDocument } from "../scenarioModel.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

const GIVEN_PATTERN = /\bGiven\b/;
const WHEN_PATTERN = /\bWhen\b/;
const THEN_PATTERN = /\bThen\b/;
const SC_TAG_RE = /^SC-\d{4}$/;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;

export async function validateScenarios(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    const expected = "spec-0001/scenario.feature";
    return [
      issue(
        "QFAI-SC-000",
        `Scenario ファイルが見つかりません。配置場所: ${config.paths.specsDir} / 期待パターン: ${expected}`,
        "info",
        specsRoot,
        "scenario.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    let text: string;
    try {
      text = await readFile(entry.scenarioPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-SC-001",
            "scenario.feature が見つかりません。",
            "error",
            entry.scenarioPath,
            "scenario.exists",
          ),
        );
        continue;
      }
      throw error;
    }
    issues.push(...validateScenarioContent(text, entry.scenarioPath));
  }

  return issues;
}

export function validateScenarioContent(text: string, file: string): Issue[] {
  const issues: Issue[] = [];

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

  const { document, errors } = parseScenarioDocument(text, file);
  if (!document || errors.length > 0) {
    issues.push(
      issue(
        "QFAI-SC-010",
        `Gherkin の解析に失敗しました: ${errors.join(", ") || "unknown"}`,
        "error",
        file,
        "scenario.parse",
      ),
    );
    return issues;
  }

  const featureSpecTags = document.featureTags.filter((tag) =>
    SPEC_TAG_RE.test(tag),
  );
  if (featureSpecTags.length > 1) {
    issues.push(
      issue(
        "QFAI-SC-009",
        `Feature の SPEC タグが複数あります: ${featureSpecTags.join(", ")}`,
        "error",
        file,
        "scenario.featureSpec",
        featureSpecTags,
      ),
    );
  }

  const missingStructure: string[] = [];
  if (!document.featureName) missingStructure.push("Feature");
  if (document.scenarios.length === 0) missingStructure.push("Scenario");
  if (missingStructure.length > 0) {
    issues.push(
      issue(
        "QFAI-SC-006",
        `Scenario ファイルに必要な構造がありません: ${missingStructure.join(
          ", ",
        )}`,
        "error",
        file,
        "scenario.structure",
      ),
    );
  }

  for (const scenario of document.scenarios) {
    if (scenario.tags.length === 0) {
      issues.push(
        issue(
          "QFAI-SC-007",
          `Scenario タグが見つかりません: ${scenario.name}`,
          "error",
          file,
          "scenario.tags",
        ),
      );
      continue;
    }

    const missingTags: string[] = [];
    const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
    if (scTags.length === 0) {
      missingTags.push("SC(0件)");
    } else if (scTags.length > 1) {
      missingTags.push(`SC(${scTags.length}件/1件必須)`);
    }
    if (missingTags.length > 0) {
      issues.push(
        issue(
          "QFAI-SC-008",
          `Scenario タグに不足があります: ${missingTags.join(", ")} (${
            scenario.name
          })`,
          "error",
          file,
          "scenario.tagIds",
        ),
      );
    }
  }

  for (const scenario of document.scenarios) {
    const missingSteps: string[] = [];
    const keywords = scenario.steps.map((step) => step.keyword.trim());
    if (!keywords.some((keyword) => GIVEN_PATTERN.test(keyword))) {
      missingSteps.push("Given");
    }
    if (!keywords.some((keyword) => WHEN_PATTERN.test(keyword))) {
      missingSteps.push("When");
    }
    if (!keywords.some((keyword) => THEN_PATTERN.test(keyword))) {
      missingSteps.push("Then");
    }
    if (missingSteps.length > 0) {
      issues.push(
        issue(
          "QFAI-SC-005",
          `Given/When/Then が不足しています: ${missingSteps.join(", ")} (${
            scenario.name
          })`,
          "warning",
          file,
          "scenario.steps",
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
