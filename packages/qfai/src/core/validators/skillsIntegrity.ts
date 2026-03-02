import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { diffProjectSkillsAgainstInitAssets } from "../skillsIntegrity.js";

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

  return [
    {
      code: "QFAI-SKILLS-001",
      severity: "error",
      category: "change",
      message: `標準資産 '.qfai/assistant/skills/**' が改変されています（${hints || `差分=${total}`}）。${sampleText}`,
      suggested_action: [
        "skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
        "次のいずれかを実施してください:",
        "- 変更したい場合: 同一相対パスで '.qfai/assistant/skills.local/**' に置いて override",
        "- 標準状態へ戻す場合: 'qfai init --force' を実行（skills のみ上書き、skills.local は保護）",
      ].join("\n"),
      rule: "skills.integrity",
    },
  ];
}
