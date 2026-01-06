import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecPackDirs } from "../discovery.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

const SECTION_RE = /^##\s+変更区分/m;
const COMPAT_LINE_RE = /^\s*-\s*\[[ xX]\]\s*Compatibility\b/m;
const CHANGE_LINE_RE = /^\s*-\s*\[[ xX]\]\s*Change\/Improvement\b/m;
const COMPAT_CHECKED_RE = /^\s*-\s*\[[xX]\]\s*Compatibility\b/m;
const CHANGE_CHECKED_RE = /^\s*-\s*\[[xX]\]\s*Change\/Improvement\b/m;

export async function validateDeltas(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const packs = await collectSpecPackDirs(specsRoot);
  if (packs.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const pack of packs) {
    const deltaPath = path.join(pack, "delta.md");
    let text: string;
    try {
      text = await readFile(deltaPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-DELTA-001",
            "delta.md が見つかりません。",
            "error",
            deltaPath,
            "delta.exists",
          ),
        );
        continue;
      }
      throw error;
    }

    const hasSection = SECTION_RE.test(text);
    const hasCompatibility = COMPAT_LINE_RE.test(text);
    const hasChange = CHANGE_LINE_RE.test(text);
    if (!hasSection || !hasCompatibility || !hasChange) {
      issues.push(
        issue(
          "QFAI-DELTA-002",
          "delta.md の変更区分が不足しています。`## 変更区分` とチェックボックス（Compatibility / Change/Improvement）を追加してください。",
          "error",
          deltaPath,
          "delta.section",
        ),
      );
      continue;
    }

    const compatibilityChecked = COMPAT_CHECKED_RE.test(text);
    const changeChecked = CHANGE_CHECKED_RE.test(text);
    if (compatibilityChecked === changeChecked) {
      issues.push(
        issue(
          "QFAI-DELTA-003",
          "delta.md の変更区分はどちらか1つだけ選択してください（両方ON/両方OFFは無効です）。",
          "error",
          deltaPath,
          "delta.classification",
        ),
      );
    }
  }

  return issues;
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
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
