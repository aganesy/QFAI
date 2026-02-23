import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestRequirePack } from "../requirePack.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export async function validateRequirePackReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const requireRoot = resolvePath(root, config, "requireDir");
  const readiness = await inspectLatestRequirePack(requireRoot);
  const issues: Issue[] = [];

  if (readiness.dangerousPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-RPACK-005",
        `require 配下に命名不正の require-* ディレクトリがあります: ${readiness.dangerousPackNames.join(", ")}`,
        "error",
        requireRoot,
        "requirePack.naming",
        readiness.dangerousPackNames,
        "change",
        [
          "新規 pack は `require-YYYYMMDDhhmmssSSS/` のみ許可されます。",
          "既存の不正ディレクトリは `require-legacy-*` などへ退避し、latest 判定対象から外してください。",
        ].join("\n"),
      ),
    );
  }

  if (readiness.legacyPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-RPACK-006",
        `legacy require-pack を検出しました（v1.4.30 は warning）: ${readiness.legacyPackNames.join(", ")}`,
        "warning",
        requireRoot,
        "requirePack.legacy",
        readiness.legacyPackNames,
        "change",
        [
          "legacy 連番 pack（例: require-0001）は段階的に廃止されます。",
          "移行時は `require-legacy-*` へ退避するか、削除してください。",
        ].join("\n"),
      ),
    );
  }

  if (!readiness.latestPackDir || !readiness.latestPackName) {
    issues.push(
      issue(
        "QFAI-RPACK-001",
        "require-pack が見つかりません。`.qfai/require/require-YYYYMMDDhhmmssSSS/` を作成してください。",
        "error",
        requireRoot,
        "requirePack.presence",
        undefined,
        "change",
        [
          "次の手順を実施してください:",
          "- `/qfai-require` を実行して最新の require-pack を生成する",
          "- 生成後に `qfai validate` を再実行する",
        ].join("\n"),
      ),
    );
    return issues;
  }

  if (readiness.missingFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-RPACK-002",
        `require-pack の必須ファイルが不足しています: ${readiness.missingFiles.join(", ")}`,
        "error",
        readiness.latestPackDir,
        "requirePack.requiredFiles",
        readiness.missingFiles,
        "change",
        "latest require-pack に `01_Sources.md` から `09_delta.md` までの9ファイルを揃えてください。",
      ),
    );
  }

  if (readiness.incompleteFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-RPACK-003",
        `require-pack の内容が不十分です: ${readiness.incompleteFiles.join(", ")}`,
        "error",
        readiness.latestPackDir,
        "requirePack.minimumContent",
        readiness.incompleteFiles,
        "change",
        [
          "各ファイルで最小内容を満たしてください:",
          "- 100文字以上",
          "- 見出しだけでなく本文を含む",
          "- `TBD` / `TODO` / `(placeholder)` のみで終わらせない",
        ].join("\n"),
      ),
    );
  }

  if (readiness.blockingOqIds.length > 0) {
    const oqPath = path.join(readiness.latestPackDir, "08_OQ.md");
    issues.push(
      issue(
        "QFAI-RPACK-004",
        `Blocking OQ が残っています（Disposition: open + Gate: discuss|require|sdd）: ${readiness.blockingOqIds.join(", ")}`,
        "error",
        oqPath,
        "requirePack.blockingOq",
        readiness.blockingOqIds,
        "change",
        "08_OQ.md の該当 OQ を `Disposition: deferred` または `resolved` に更新してください。",
      ),
    );
  }

  return issues;
}
