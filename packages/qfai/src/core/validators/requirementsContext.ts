import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import type { Issue } from "../types.js";
import { isMissingFileError, issue } from "./utils.js";

const CONTEXT_FILES = {
  glossary: "glossary.md",
  actors: "actors.md",
  businessFlows: "business-flows.md",
} as const;

/**
 * v1.3.3 staged adoption validator.
 *
 * Goals:
 * - Warn when the v1.3.1+ requirements context SSOT is missing.
 * - Keep compatibility by using info/warning only (no error).
 */
export async function validateRequirementsContext(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const requireRoot = resolvePath(root, config, "requireDir");

  if (!(await existsDir(requireRoot))) {
    return [
      issue(
        "QFAI-REQCTX-000",
        `requirements ディレクトリが見つかりません: ${config.paths.requireDir}`,
        "info",
        requireRoot,
        "require.context.dir",
        undefined,
        "change",
        [
          "v1.3.3 では段階導入として info/warning のみ出します（Fail にはしません）。",
          "次のいずれかを実施してください:",
          `- ${config.paths.requireDir} を作成し、テンプレ（glossary/actors/business-flows）を追加`,
          "- 既存プロジェクトの場合: /qfai-require で require 配下のSSOTを生成",
        ].join("\n"),
      ),
    ];
  }

  const issues: Issue[] = [];
  const checkMissing = async (
    key: keyof typeof CONTEXT_FILES,
    code: string,
  ): Promise<void> => {
    const fileName = CONTEXT_FILES[key];
    const filePath = path.join(requireRoot, fileName);
    if (await existsFile(filePath)) {
      return;
    }
    issues.push(
      issue(
        code,
        `requirements コンテキストファイルが不足しています: ${path.posix.join(
          config.paths.requireDir,
          fileName,
        )}`,
        "warning",
        filePath,
        "require.context.files",
        undefined,
        "change",
        [
          "v1.3.3 では段階導入として warning のみ出します（Fail にはしません）。",
          "推奨構造: requirements を Actors / Business Flows / Glossary のSSOTから分解します。",
          "テンプレ生成の推奨:",
          "- /qfai-require を実行し、require 配下のSSOT（glossary/actors/business-flows）を生成",
        ].join("\n"),
      ),
    );
  };

  await checkMissing("glossary", "QFAI-REQCTX-001");
  await checkMissing("actors", "QFAI-REQCTX-002");
  await checkMissing("businessFlows", "QFAI-REQCTX-003");

  const requireMdPath = path.join(requireRoot, "require.md");
  if (!(await existsFile(requireMdPath))) {
    issues.push(
      issue(
        "QFAI-REQCTX-010",
        `require.md が見つからないため Coverage Map チェックをスキップしました: ${path.posix.join(
          config.paths.requireDir,
          "require.md",
        )}`,
        "info",
        requireMdPath,
        "require.context.coverageMap",
        undefined,
        "change",
        [
          "require.md は /qfai-require で生成される想定です。",
          "Coverage Map（BF step → REQ/SPEC 対応表）を require.md に置く運用にすると、要件→仕様→テストの抜け漏れを機械的に検出できます。",
        ].join("\n"),
      ),
    );
  } else {
    let text: string;
    try {
      text = await readFile(requireMdPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return issues;
      }
      throw error;
    }
    if (!hasBusinessFlowCoverageMap(text)) {
      issues.push(
        issue(
          "QFAI-REQCTX-004",
          "require.md に Business Flow Coverage Map が見つかりません（BF step → REQ/SPEC の対応表）。",
          "warning",
          requireMdPath,
          "require.context.coverageMap",
          undefined,
          "change",
          [
            "v1.3.1+ の推奨構造:",
            "- business-flows.md の BF step を分割単位として spec pack / scenario に落とします。",
            "- require.md に Coverage Map を置き、in-scope BF step が必ず REQ/SPEC に紐づくことを保証します。",
            "対応例:",
            "- `## Business Flow Coverage Map` セクションを追加し、BF-*-S## を表形式で列挙",
          ].join("\n"),
        ),
      );
    }
  }

  return issues;
}

function hasBusinessFlowCoverageMap(text: string): boolean {
  if (/^##\s+Business Flow Coverage Map\s*$/m.test(text)) {
    return true;
  }
  if (/\bBF-\d{4}-S\d{2}\b/.test(text) && /Coverage Map/i.test(text)) {
    return true;
  }
  return false;
}

async function existsFile(target: string): Promise<boolean> {
  try {
    const stats = await stat(target);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function existsDir(target: string): Promise<boolean> {
  try {
    const stats = await stat(target);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
