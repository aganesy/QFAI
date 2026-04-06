import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { readValidatedClassification } from "../detection/surfaceType.js";
import { CANONICAL_PROTOTYPING_SURFACES } from "../domain/surface.js";
import {
  findLatestDiscussionPackDir,
  isPrototypingRequiredForDiscussionPack,
} from "../discussionPack.js";
import {
  hasLegacyRecommendationKeys,
  hasNamespacedRecommendationBlock,
  isPlainRecord,
} from "../prototyping/recommendationSchema.js";
import { validateRecommendationSemantics } from "../prototyping/recommendationSemantics.js";
import type { PrototypingMode } from "../prototyping/types.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const VALID_MODES = new Set(["low-cost", "standard", "full-harness"]);
const VALID_SURFACES = new Set(CANONICAL_PROTOTYPING_SURFACES);

export async function validatePrototypingRecommendation(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const latestPackDir = await findLatestDiscussionPackDir(discussionRoot);
  if (!latestPackDir) {
    return [];
  }

  const targetPath = path.join(latestPackDir, "prototyping.yaml");
  let raw: string;
  try {
    raw = await readFile(targetPath, "utf-8");
  } catch {
    const classification = await readValidatedClassification(latestPackDir);
    if (!isPrototypingRequiredForDiscussionPack(classification)) {
      return [];
    }
    return [
      issue(
        "QFAI-PROT-153",
        "latest UI-bearing discussion pack では prototyping.yaml が必須です。",
        "error",
        latestPackDir,
        "prototypingRecommendation.missing",
        undefined,
        "canonical",
        "latest discussion pack の classification を確認し、UI-bearing pack なら prototyping.yaml を追加してください。",
      ),
    ];
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (error) {
    return [
      issue(
        "QFAI-PROT-153",
        `prototyping.yaml の YAML 解析に失敗しました: ${formatError(error)}`,
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "canonical",
        "latest discussion pack の prototyping.yaml を schema に合わせて修正してください。",
      ),
    ];
  }

  if (!isPlainRecord(parsed)) {
    return [
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml はトップレベル object である必要があります。",
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "canonical",
        "prototyping.recommended_mode / prototyping.rationale / prototyping.allowed_modes / prototyping.surface を持つ namespaced object に修正してください。",
      ),
    ];
  }

  if (!hasNamespacedRecommendationBlock(parsed)) {
    return [
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml は canonical namespaced schema (`prototyping.*`) を必須とします。",
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "canonical",
        "top-level schema を削除し、`prototyping.recommended_mode / rationale / allowed_modes / surface` を定義してください。",
      ),
    ];
  }

  if (hasLegacyRecommendationKeys(parsed)) {
    return [
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml must use the canonical namespaced schema under 'prototyping:' only. Legacy top-level recommendation keys are not supported.",
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "canonical",
        "top-level の recommended_mode / rationale / allowed_modes / surface を削除し、`prototyping:` block のみに統一してください。",
      ),
    ];
  }

  if (!isPlainRecord(parsed.prototyping)) {
    return [
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の prototyping キーが object ではありません。namespaced block は plain object である必要があります。",
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "canonical",
        "prototyping:\n  recommended_mode: ...\n  rationale: ...\n  allowed_modes: [...]\n  surface: ...\nの形式に書き換えてください。",
      ),
    ];
  }

  const block = parsed.prototyping;
  const recommendedMode = block.recommended_mode;
  const rationale = block.rationale;
  const allowedModes = block.allowed_modes;
  const surface = block.surface;
  const issues: Issue[] = [];

  if (typeof recommendedMode !== "string" || !VALID_MODES.has(recommendedMode)) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の recommended_mode が不正です。",
        "error",
        targetPath,
        "prototypingRecommendation.recommendedMode",
        undefined,
        "canonical",
        "recommended_mode は low-cost|standard|full-harness のいずれかにしてください。",
      ),
    );
  }

  if (typeof rationale !== "string" || rationale.trim().length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の rationale は空でない文字列が必要です。",
        "error",
        targetPath,
        "prototypingRecommendation.rationale",
        undefined,
        "canonical",
        "rationale を非空文字列で記載してください。",
      ),
    );
  }

  let normalizedAllowedModes: string[] | undefined;
  if (allowedModes === undefined) {
    issues.push(
      issue(
        "QFAI-PROT-155",
        "prototyping.yaml に allowed_modes がありません。",
        "error",
        targetPath,
        "prototypingRecommendation.allowedModesRequired",
        undefined,
        "canonical",
        "allowed_modes は low-cost|standard|full-harness の重複なし配列で必須です。",
      ),
    );
  } else if (
    !Array.isArray(allowedModes) ||
    !allowedModes.every((value) => typeof value === "string" && VALID_MODES.has(value))
  ) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の allowed_modes は有効な mode の配列である必要があります。",
        "error",
        targetPath,
        "prototypingRecommendation.allowedModes",
        undefined,
        "canonical",
        "allowed_modes は low-cost|standard|full-harness の重複なし配列にしてください。",
      ),
    );
  } else {
    normalizedAllowedModes = Array.from(new Set(allowedModes));
  }

  if (surface === undefined) {
    issues.push(
      issue(
        "QFAI-PROT-156",
        "prototyping.yaml に surface がありません。",
        "error",
        targetPath,
        "prototypingRecommendation.surfaceRequired",
        undefined,
        "canonical",
        `surface は ${CANONICAL_PROTOTYPING_SURFACES.join("|")} のいずれかで必須です。`,
      ),
    );
  } else if (
    typeof surface !== "string" ||
    !VALID_SURFACES.has(surface as (typeof CANONICAL_PROTOTYPING_SURFACES)[number])
  ) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の surface が不正です。",
        "error",
        targetPath,
        "prototypingRecommendation.surface",
        undefined,
        "canonical",
        `surface は ${CANONICAL_PROTOTYPING_SURFACES.join("|")} のいずれかにしてください。`,
      ),
    );
  }

  if (
    normalizedAllowedModes &&
    typeof recommendedMode === "string" &&
    VALID_MODES.has(recommendedMode)
  ) {
    const semanticResult = validateRecommendationSemantics({
      recommendedMode: recommendedMode as PrototypingMode,
      allowedModes: normalizedAllowedModes as PrototypingMode[],
    });
    if (!semanticResult.valid) {
      issues.push(
        issue(
          semanticResult.code,
          "allowed_modes は recommended_mode を含む必要があります。",
          "error",
          targetPath,
          "prototypingRecommendation.allowedModesContainsRecommended",
          [`recommended_mode=${recommendedMode}`],
          "canonical",
          "allowed_modes に recommended_mode を追加してください。",
        ),
      );
    }
  }

  return issues;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
