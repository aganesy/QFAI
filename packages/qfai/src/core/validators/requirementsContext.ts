import { readdir, readFile, stat } from "node:fs/promises";
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
const REQUIRE_PACK_PATTERN = /^REQUIRE-\d{4}$/;

/**
 * requirements context validator (legacy + v1.4.2 package mode).
 *
 * Goals:
 * - Treat REQUIRE-XXXX packages as first-class inputs.
 * - Keep legacy glossary/actors/business-flows checks for backward compatibility.
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
          "requirements ディレクトリがないため、コンテキスト検証の一部（glossary/actors/coverage map）はスキップします。",
          "REQUIRE-XXXX パッケージ（推奨）または legacy の business-flows.md が必要です。",
          "次のいずれかを実施してください:",
          `- ${config.paths.requireDir} を作成し、REQUIRE-XXXX パッケージを配置`,
          `- ${config.paths.requireDir} を作成し、legacy テンプレ（glossary/actors/business-flows）を追加`,
          "- 既存プロジェクトの場合: /qfai-require で require 配下のSSOTを生成",
        ].join("\n"),
      ),
      issue(
        "QFAI-REQCTX-003",
        `必須の要件コンテキストが不足しています: ${path.posix.join(
          config.paths.requireDir,
          CONTEXT_FILES.businessFlows,
        )}`,
        "error",
        requireRoot,
        "require.context.files",
        undefined,
        "change",
        [
          "次のいずれかが必要です:",
          "- REQUIRE-XXXX パッケージ（v1.4.2+ 推奨）",
          "- legacy business-flows.md（Mermaid sequenceDiagram）",
          "テンプレ生成の推奨:",
          "- /qfai-require を実行して require 配下の成果物を生成",
        ].join("\n"),
      ),
    ];
  }

  const issues: Issue[] = [];
  const requirePackageDirs = await findRequirePackageDirs(requireRoot);
  const hasRequirePackage = requirePackageDirs.length > 0;
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
              "REQUIRE-XXXX パッケージが存在しない場合、business-flows.md は必須です（Fail）。",
              "または REQUIRE-XXXX パッケージを配置してください（v1.4.2+ 推奨）。",
              "テンプレ生成の推奨:",
              "- /qfai-require を実行し、require 配下の成果物を生成",
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

  let missingBusinessFlows = !(await existsFile(businessFlowsPath));
  if (!hasRequirePackage) {
    await checkMissing("glossary", "QFAI-REQCTX-001", "warning");
    await checkMissing("actors", "QFAI-REQCTX-002", "warning");
    missingBusinessFlows = await checkMissing("businessFlows", "QFAI-REQCTX-003", "error");
  }

  if (!missingBusinessFlows) {
    let businessFlowsText: string | undefined;
    try {
      businessFlowsText = await readFile(businessFlowsPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        businessFlowsText = undefined;
      } else {
        throw error;
      }
    }

    if (businessFlowsText !== undefined) {
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
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!isLegacyStepsHeading(line)) {
      continue;
    }

    let inFence = false;
    for (let j = i + 1; j < lines.length; j++) {
      const bodyLine = lines[j] ?? "";
      if (/^\s*```/.test(bodyLine)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) {
        continue;
      }
      if (/^\s{0,3}#{1,6}\s+/.test(bodyLine)) {
        break;
      }
      if (/^\s*[-*]\s*\[BF-\d{4}-S\d{2}\]/.test(bodyLine)) {
        return true;
      }
    }
  }

  return false;
}

function isLegacyStepsHeading(line: string): boolean {
  return /^\s*(?:[-*]\s*)?Steps(?:\s*\(candidate\))?\s*:?\s*$/i.test(line);
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

async function findRequirePackageDirs(requireRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(requireRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && REQUIRE_PACK_PATTERN.test(entry.name))
      .map((entry) => path.join(requireRoot, entry.name));
  } catch {
    return [];
  }
}
