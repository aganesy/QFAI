import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectScenarioFiles } from "../discovery.js";
import { extractInvalidIds } from "../ids.js";
import { parseGherkinFeature } from "../parse/gherkin.js";
import type { Issue, IssueSeverity } from "../types.js";

const GIVEN_PATTERN = /\bGiven\b/;
const WHEN_PATTERN = /\bWhen\b/;
const THEN_PATTERN = /\bThen\b/;
const SC_TAG_RE = /^SC-\d{4}$/;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const BR_TAG_RE = /^BR-\d{4}$/;

export async function validateScenarios(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const files = await collectScenarioFiles(specsRoot);

  if (files.length === 0) {
    return [
      issue(
        "QFAI-SC-000",
        "Scenario ファイルが見つかりません。",
        "info",
        specsRoot,
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
  const parsed = parseGherkinFeature(text, file);

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

  const missingStructure: string[] = [];
  if (!parsed.featurePresent) missingStructure.push("Feature");
  if (parsed.scenarios.length === 0) missingStructure.push("Scenario");
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

  for (const scenario of parsed.scenarios) {
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
    if (!scenario.tags.some((tag) => SPEC_TAG_RE.test(tag))) {
      missingTags.push("SPEC");
    }
    if (!scenario.tags.some((tag) => BR_TAG_RE.test(tag))) {
      missingTags.push("BR");
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

  for (const scenario of parsed.scenarios) {
    const missingSteps: string[] = [];
    if (!GIVEN_PATTERN.test(scenario.body)) {
      missingSteps.push("Given");
    }
    if (!WHEN_PATTERN.test(scenario.body)) {
      missingSteps.push("When");
    }
    if (!THEN_PATTERN.test(scenario.body)) {
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
