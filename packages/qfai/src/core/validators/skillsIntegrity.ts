import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { diffProjectSkillsAgainstInitAssets } from "../skillsIntegrity.js";

/**
 * The skills directory as the finding should name it: repo-relative when it
 * sits under the project, absolute when `paths.skillsDir` points outside it.
 * The diff is taken against whatever that setting resolves to, so naming the
 * default location instead would send a project that moved its skills tree to
 * repair a directory it does not use.
 */
function describeSkillsDir(root: string, skillsDir: string): string {
  const relative = path.relative(root, skillsDir).replace(/\\/g, "/");
  return relative.length > 0 && !relative.startsWith("..") ? relative : skillsDir;
}

export async function validateSkillsIntegrity(root: string, config: QfaiConfig): Promise<Issue[]> {
  const diff = await diffProjectSkillsAgainstInitAssets(root, config);
  if (diff.status !== "modified") {
    return [];
  }

  const total = diff.missing.length + diff.extra.length + diff.changed.length;
  const hints = [
    diff.changed.length > 0 ? `変更: ${diff.changed.length}` : null,
    diff.missing.length > 0 ? `削除: ${diff.missing.length}` : null,
    diff.extra.length > 0 ? `追加: ${diff.extra.length}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const sample = [...diff.changed, ...diff.missing, ...diff.extra].slice(0, 10);
  const sampleText = sample.length > 0 ? ` 例: ${sample.join(", ")}` : "";
  const skillsDir = describeSkillsDir(root, diff.skillsDir);

  return [
    {
      code: "QFAI-SKILLS-001",
      severity: "error",
      category: "change",
      file: skillsDir,
      message: `標準資産 '${skillsDir}/**' が改変されています（${hints || `差分=${total}`}）。${sampleText}`,
      suggested_action: [
        "skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
        "標準状態へ戻す場合は 'qfai init --force' を実行してください。",
      ].join("\n"),
      rule: "skills.integrity",
    },
  ];
}
