import type { Issue } from "../types.js";
import { diffProjectPromptsAgainstInitAssets } from "../promptsIntegrity.js";

export async function validatePromptsIntegrity(root: string): Promise<Issue[]> {
  const diff = await diffProjectPromptsAgainstInitAssets(root);
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
      code: "QFAI-PROMPTS-001",
      severity: "error",
      category: "change",
      message: `標準資産 '.qfai/prompts/**' が改変されています（${hints || `差分=${total}`}）。${sampleText}`,
      suggested_action: [
        "prompts の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
        "次のいずれかを実施してください:",
        "- 変更したい場合: 同一相対パスで '.qfai/prompts.local/**' に置いて overlay",
        "- 標準状態へ戻す場合: 'qfai init --force' を実行（prompts のみ上書き、prompts.local は保護）",
      ].join("\n"),
      rule: "prompts.integrity",
    },
  ];
}
