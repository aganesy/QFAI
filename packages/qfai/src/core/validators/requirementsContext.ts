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
 * v1.3.15 requirements context validator.
 *
 * Goals:
 * - Keep glossary/actors checks for gradual adoption.
 * - Enforce business-flows.md (Mermaid sequenceDiagram) as a fail condition.
 */
export async function validateRequirementsContext(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const requireRoot = resolvePath(root, config, "requireDir");
  const businessFlowsPath = path.join(requireRoot, CONTEXT_FILES.businessFlows);

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
          "requirements ディレクトリがないため、コンテキスト検証を実行できません。",
          "次のいずれかを実施してください:",
          `- ${config.paths.requireDir} を作成し、テンプレ（glossary/actors/business-flows）を追加`,
          "- 既存プロジェクトの場合: /qfai-require で require 配下のSSOTを生成",
        ].join("\n"),
      ),
      issue(
        "QFAI-REQCTX-003",
        `必須ファイルが不足しています: ${path.posix.join(
          config.paths.requireDir,
          CONTEXT_FILES.businessFlows,
        )}`,
        "error",
        businessFlowsPath,
        "require.context.files",
        undefined,
        "change",
        [
          "v1.3.15 から business-flows.md は必須です（Fail）。",
          "business-flows.md を作成し、Mermaid sequenceDiagram を記述してください。",
          "テンプレ生成の推奨:",
          "- /qfai-require を実行して require 配下のSSOTを生成",
        ].join("\n"),
      ),
    ];
  }

  const issues: Issue[] = [];
  const checkMissing = async (
    key: keyof typeof CONTEXT_FILES,
    code: string,
    severity: "warning" | "error",
  ): Promise<boolean> => {
    const fileName = CONTEXT_FILES[key];
    const filePath = path.join(requireRoot, fileName);
    if (await existsFile(filePath)) {
      return false;
    }
    const isBusinessFlows = key === "businessFlows";
    issues.push(
      issue(
        code,
        `requirements コンテキストファイルが不足しています: ${path.posix.join(
          config.paths.requireDir,
          fileName,
        )}`,
        severity,
        filePath,
        "require.context.files",
        undefined,
        "change",
        isBusinessFlows
          ? [
              "v1.3.15 から business-flows.md は必須です（Fail）。",
              "business-flows.md を作成し、Mermaid sequenceDiagram を記述してください。",
              "テンプレ生成の推奨:",
              "- /qfai-require を実行し、require 配下のSSOT（glossary/actors/business-flows）を生成",
            ].join("\n")
          : [
              "推奨構造: requirements を Actors / Business Flows / Glossary のSSOTから分解します。",
              "テンプレ生成の推奨:",
              "- /qfai-require を実行し、require 配下のSSOT（glossary/actors/business-flows）を生成",
            ].join("\n"),
      ),
    );
    return true;
  };

  await checkMissing("glossary", "QFAI-REQCTX-001", "warning");
  await checkMissing("actors", "QFAI-REQCTX-002", "warning");
  const missingBusinessFlows = await checkMissing(
    "businessFlows",
    "QFAI-REQCTX-003",
    "error",
  );

  if (!missingBusinessFlows) {
    let businessFlowsText: string;
    try {
      businessFlowsText = await readFile(businessFlowsPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return issues;
      }
      throw error;
    }

    if (!hasMermaidSequenceDiagram(businessFlowsText)) {
      issues.push(
        issue(
          "QFAI-REQCTX-020",
          "business-flows.md に Mermaid sequenceDiagram が見つかりません。",
          "error",
          businessFlowsPath,
          "require.context.businessFlows",
          undefined,
          "change",
          [
            "business-flows.md は Mermaid sequenceDiagram 形式が必須です。",
            "例:",
            "```mermaid",
            "sequenceDiagram",
            "  participant User",
            "  participant System",
            "  User->>System: BF-0001-S01 <action>",
            "```",
          ].join("\n"),
        ),
      );
    }

    if (hasLegacyBulletSteps(businessFlowsText)) {
      issues.push(
        issue(
          "QFAI-REQCTX-021",
          "business-flows.md に旧形式（Steps の箇条書き）が検出されました。",
          "error",
          businessFlowsPath,
          "require.context.businessFlows",
          undefined,
          "change",
          [
            "旧形式の `Steps:` 箇条書きは v1.3.15 から非推奨ではなく禁止です。",
            "BF step は Mermaid sequenceDiagram のメッセージ行で表現してください。",
          ].join("\n"),
        ),
      );
    }
  }

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

function hasMermaidSequenceDiagram(text: string): boolean {
  return /```mermaid[\s\S]*?\bsequenceDiagram\b[\s\S]*?```/m.test(text);
}

function hasLegacyBulletSteps(text: string): boolean {
  if (/^\s*-\s*\[BF-\d{4}-S\d{2}\]/m.test(text)) {
    return true;
  }
  if (/\bSteps\b\s*(?:\(candidate\)|:)/i.test(text)) {
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
