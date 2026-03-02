import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BASELINE_STATUS_ARTIFACTS = new Set(["README.md", ".gitignore"]);

export async function validateLegacyStatusDir(root: string): Promise<Issue[]> {
  const statusDir = path.join(root, ".qfai", "status");
  if (!(await isDirectory(statusDir))) {
    return [];
  }

  const issues: Issue[] = [
    issue(
      "LEGACY_STATUS_DIR",
      "legacy status dir を検出しました。`.qfai/status` 依存は廃止予定です。",
      "warning",
      statusDir,
      "status.legacyDir",
      undefined,
      "change",
      "status は `.qfai/report/run-*` の実行ログへ移行してください。",
    ),
  ];

  const artifacts = await listStatusArtifacts(statusDir);
  const nonBaseline = artifacts.filter((name) => !BASELINE_STATUS_ARTIFACTS.has(name));
  if (nonBaseline.length === 0) {
    return issues;
  }

  issues.push(
    issue(
      "LEGACY_STATUS_DIR_NONEMPTY",
      `legacy status dir に移行対象の成果物があります: ${nonBaseline.join(", ")}`,
      "warning",
      statusDir,
      "status.legacyDirNonEmpty",
      nonBaseline,
      "change",
      "運用状態は `.qfai/report/run-*` 配下へ移管し、`.qfai/status` を空にしてください。",
    ),
  );

  return issues;
}

async function listStatusArtifacts(statusDir: string): Promise<string[]> {
  try {
    const entries = await readdir(statusDir, { withFileTypes: true });
    return entries
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}
