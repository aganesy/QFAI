import { readFile } from "node:fs/promises";

import { loadConfig, resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { extractIds } from "../ids.js";
import type { Issue } from "../types.js";

const GIVEN_PATTERN = /\bGiven\b/;
const WHEN_PATTERN = /\bWhen\b/;
const THEN_PATTERN = /\bThen\b/;

export async function validateScenarios(root: string): Promise<Issue[]> {
  const config = await loadConfig(root);
  const scenariosRoot = resolvePath(root, config, "scenariosDir");
  const files = await collectFiles(scenariosRoot, { extensions: [".md"] });

  if (files.length === 0) {
    return [
      issue(
        "QFAI-SC-000",
        "Scenario ファイルが見つかりません。",
        scenariosRoot,
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

  const scIds = extractIds(text, "SC");
  if (scIds.length === 0) {
    issues.push(issue("QFAI-SC-001", "SC ID が見つかりません。", file));
  }

  const specIds = extractIds(text, "SPEC");
  if (specIds.length === 0) {
    issues.push(
      issue("QFAI-SC-002", "SC は SPEC を参照する必要があります。", file),
    );
  }

  const brIds = extractIds(text, "BR");
  if (brIds.length === 0) {
    issues.push(
      issue("QFAI-SC-003", "SC は BR を参照する必要があります。", file),
    );
  }

  const contractIds = [
    ...extractIds(text, "UI"),
    ...extractIds(text, "API"),
    ...extractIds(text, "DATA"),
  ];
  if (contractIds.length === 0) {
    issues.push(
      issue(
        "QFAI-SC-004",
        "SC は UI/API/DATA のいずれかを参照する必要があります。",
        file,
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
        file,
      ),
    );
  }

  return issues;
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
