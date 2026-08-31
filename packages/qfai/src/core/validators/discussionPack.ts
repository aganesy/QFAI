import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";
import { resolveImportLiteEntrypoint } from "../preflight/importLiteEvidence.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export async function validateDiscussionPackReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const readiness = await inspectLatestDiscussionPack(discussionRoot);
  const issues: Issue[] = [];

  if (readiness.dangerousPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-005",
        `discussion 配下に命名不正の discussion-* ディレクトリがあります: ${readiness.dangerousPackNames.join(", ")}`,
        "error",
        discussionRoot,
        "discussionPack.naming",
        readiness.dangerousPackNames,
        "change",
        [
          "現在の正規命名 (`discussion-YYYYMMDDhhmmssSSS/`) のみサポートされています。不正なディレクトリを削除またはリネームしてください。",
          "Only canonical naming is supported. Remove or rename the non-canonical discussion directory.",
        ].join("\n"),
      ),
    );
  }

  if (readiness.legacyPackNames.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-006",
        `current canonical discussion-pack naming does not allow sequential pack directories: ${readiness.legacyPackNames.join(", ")}`,
        "warning",
        discussionRoot,
        "discussionPack.legacy",
        readiness.legacyPackNames,
        "change",
        [
          "現在の正規レイアウトのみサポートされています。不正なディレクトリを削除またはリネームしてください。",
          "Only canonical layout is supported. Remove or rename the non-canonical discussion directory.",
        ].join("\n"),
      ),
    );
  }

  if (!readiness.latestPackDir || !readiness.latestPackName) {
    // The import-lite entrypoint is the sanctioned substitute for a project
    // that already carries specs and never ran `/qfai-discussion`
    // (`QFAI-IMPLITE-001`). Without this the final gate
    // (`validate --profile verify --fail-on error`) reported DPACK-001 as an
    // error on exactly the projects the preflight declares ready, so such a
    // project could never reach DoD. It applies only when no pack of any name
    // exists, so a misnamed pack still fails on QFAI-DPACK-005 above.
    if ((await resolveImportLiteEntrypoint(root, config)) !== null) {
      return issues;
    }
    issues.push(
      issue(
        "QFAI-DPACK-001",
        "discussion-pack が見つかりません。`.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/` を作成してください。",
        "error",
        discussionRoot,
        "discussionPack.presence",
        undefined,
        "change",
        [
          "次の手順を実施してください:",
          "- `/qfai-discussion` を実行して最新の discussion-pack を生成する",
          "- 生成後に `qfai validate` を再実行する",
        ].join("\n"),
      ),
    );
    return issues;
  }

  if (readiness.missingFiles.length > 0 || readiness.missingSideArtifacts.length > 0) {
    const allMissing = [...readiness.missingFiles, ...readiness.missingSideArtifacts];
    if (allMissing.length > 0) {
      issues.push(
        issue(
          "QFAI-DPACK-002",
          `discussion-pack の必須ファイルが不足しています: ${allMissing.join(", ")}`,
          "error",
          readiness.latestPackDir,
          "discussionPack.requiredFiles",
          allMissing,
          "change",
          `不足ファイルを作成してください: ${allMissing.join(", ")}。`,
        ),
      );
    }
  }

  if (readiness.incompleteFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-DPACK-003",
        `discussion-pack の内容が不十分です: ${readiness.incompleteFiles.join(", ")}`,
        "error",
        readiness.latestPackDir,
        "discussionPack.minimumContent",
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
    const oqPath = path.join(readiness.latestPackDir, "11_OQ-Register.md");
    issues.push(
      issue(
        "QFAI-DPACK-004",
        `Blocking OQ が残っています（Disposition: open）: ${readiness.blockingOqIds.join(", ")}`,
        "error",
        oqPath,
        "discussionPack.blockingOq",
        readiness.blockingOqIds,
        "change",
        "11_OQ-Register.md の該当 OQ を `Disposition: deferred`・`resolved`・`rejected` のいずれかに更新してください。",
      ),
    );
  }

  if (readiness.deferredWithoutDetails.length > 0) {
    const deferredPath = path.join(readiness.latestPackDir, "13_Deferred.md");
    issues.push(
      issue(
        "QFAI-DPACK-007",
        `11_OQ-Register.md の deferred が 13_Deferred.md に存在しません: ${readiness.deferredWithoutDetails.join(", ")}`,
        "error",
        deferredPath,
        "discussionPack.deferredCoverage",
        readiness.deferredWithoutDetails,
        "change",
        "OQ register で deferred にした OQ は 13_Deferred.md に同じ OQ-ID で記載してください。",
      ),
    );
  }

  // Check 03_Story-Workshop.md for Mermaid diagram presence
  const storyWorkshopPath = path.join(readiness.latestPackDir, "03_Story-Workshop.md");
  const storyWorkshopText = await readSafe(storyWorkshopPath);
  if (storyWorkshopText !== null && !containsMermaidBlock(storyWorkshopText)) {
    issues.push(
      issue(
        "QFAI-DPACK-008",
        "03_Story-Workshop.md に Mermaid diagram が見つかりません。",
        "error",
        storyWorkshopPath,
        "discussionPack.storyWorkshopMermaid",
        undefined,
        "change",
        "03_Story-Workshop.md には少なくとも1つの mermaid fenced block（flowchart または sequenceDiagram）を含めてください。",
      ),
    );
  }

  return issues;
}

function containsMermaidBlock(text: string): boolean {
  // Match backtick (3+) or tilde (3+) fences with mermaid info-string,
  // aligned with MERMAID_START_RE in discussMermaid.ts.
  return /^\s*(?:`{3,}|~{3,})\s*mermaid\b/im.test(text);
}

async function readSafe(filePath: string): Promise<string | null> {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
