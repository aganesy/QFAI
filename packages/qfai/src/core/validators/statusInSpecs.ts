import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type StatusPattern = {
  label: string;
  pattern: RegExp;
};

const STRONG_PATTERNS: StatusPattern[] = [
  { label: "release_candidate:", pattern: /\brelease_candidate\s*:/i },
  { label: "status:", pattern: /^\s*(?:-\s*)?status\s*:/im },
  { label: "progress:", pattern: /^\s*(?:-\s*)?progress\s*:/im },
  { label: "risk_state:", pattern: /\brisk_state\s*:/i },
  { label: "review_gate:", pattern: /\breview_gate\s*:/i },
  { label: "last_updated_at:", pattern: /\blast_updated_at\s*:/i },
];

const SOFT_PATTERNS: StatusPattern[] = [
  { label: "risks:", pattern: /^\s*(?:-\s*)?risks?\s*:/im },
];

export async function validateStatusInSpecs(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const files = await collectFiles(specsRoot, {
    extensions: [".md"],
  });
  const issues: Issue[] = [];

  for (const file of files) {
    if (isOpenQuestionsFile(file)) {
      continue;
    }

    const text = await readSafe(file);
    if (text.length === 0) {
      continue;
    }

    const strong = collectMatchedLabels(text, STRONG_PATTERNS);
    const soft = collectMatchedLabels(text, SOFT_PATTERNS);
    if (strong.length === 0 && soft.length === 0) {
      continue;
    }

    const refs = Array.from(new Set([...strong, ...soft]));
    const message =
      strong.length > 0
        ? `specs は definition のみを保持してください。status フィールドの混入を検知しました: ${refs.join(
            ", ",
          )}`
        : `specs に status と誤解されやすいフィールドを検知しました: ${refs.join(
            ", ",
          )}`;

    issues.push(
      issue(
        "QFAI-STATUS-001",
        message,
        "warning",
        file,
        "specs.statusSeparation",
        refs,
        "change",
        "status は `.qfai/status/*.json` へ移し、specs には定義のみを残してください。",
      ),
    );
  }

  return issues;
}

function collectMatchedLabels(
  text: string,
  patterns: StatusPattern[],
): string[] {
  return patterns
    .filter((item) => hasMatch(text, item.pattern))
    .map((item) => item.label);
}

function hasMatch(text: string, pattern: RegExp): boolean {
  const matcher = new RegExp(pattern.source, pattern.flags);
  return matcher.test(text);
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function isOpenQuestionsFile(filePath: string): boolean {
  return /open-questions\.md$/i.test(path.basename(filePath));
}
