import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { extractIds, extractInvalidIds } from "../ids.js";
import type { Issue, IssueSeverity } from "../types.js";

const GIVEN_PATTERN = /\bGiven\b/;
const WHEN_PATTERN = /\bWhen\b/;
const THEN_PATTERN = /\bThen\b/;

export async function validateScenarios(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const scenariosRoot = resolvePath(root, config, "scenariosDir");
  const files = await collectFiles(scenariosRoot, {
    extensions: [".feature"],
  });

  if (files.length === 0) {
    return [
      issue(
        "QFAI-SC-000",
        "Scenario ファイルが見つかりません。",
        "info",
        scenariosRoot,
        "scenario.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    issues.push(...validateScenarioContent(text, file));
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

  const scIds = extractIds(text, "SC");
  if (scIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SC-001",
        "SC ID が見つかりません。",
        "error",
        file,
        "scenario.id",
      ),
    );
  }

  const specIds = extractIds(text, "SPEC");
  if (specIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SC-002",
        "SC は SPEC を参照する必要があります。",
        "error",
        file,
        "scenario.spec",
      ),
    );
  }

  const brIds = extractIds(text, "BR");
  if (brIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SC-003",
        "SC は BR を参照する必要があります。",
        "error",
        file,
        "scenario.br",
      ),
    );
  }

  const missingSteps: string[] = [];
  if (!GIVEN_PATTERN.test(text)) {
    missingSteps.push("Given");
  }
  if (!WHEN_PATTERN.test(text)) {
    missingSteps.push("When");
  }
  if (!THEN_PATTERN.test(text)) {
    missingSteps.push("Then");
  }
  if (missingSteps.length > 0) {
    issues.push(
      issue(
        "QFAI-SC-005",
        `Given/When/Then が不足しています: ${missingSteps.join(", ")}`,
        "warning",
        file,
        "scenario.steps",
      ),
    );
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
