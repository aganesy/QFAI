import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecPackDirs } from "../discovery.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

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
    try {
      await readFile(deltaPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-DELTA-001",
            "delta.md が見つかりません。",
            "error",
            deltaPath,
            "delta.exists",
            undefined,
            "change",
            "spec-xxxx/delta.md を作成してください（テンプレは init 生成物を参照してください）。",
          ),
        );
        continue;
      }
      throw error;
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
  category: IssueCategory = "change",
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
