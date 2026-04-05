import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import {
  hasLegacyRecommendationKeys,
  hasNamespacedRecommendationBlock,
  isPlainRecord,
} from "../prototyping/recommendationSchema.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const VALID_MODES = new Set(["low-cost", "standard", "full-harness"]);
const VALID_SURFACES = new Set(["web-ui", "mobile-ui", "desktop-ui", "mixed", "non-ui"]);

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
    // W1: prototyping.yaml is now required when a discussion pack exists
    return [
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml が discussion pack に見つかりません。15 required markdown files + required prototyping.yaml で discussion pack を完成させてください。",
        "error",
        latestPackDir,
        "prototypingRecommendation.missing",
        undefined,
        "compatibility",
        "latest discussion pack に prototyping.yaml を追加してください。",
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
        "compatibility",
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
        "compatibility",
        "prototyping.recommended_mode / prototyping.rationale / prototyping.allowed_modes を持つ namespaced object に修正してください。",
      ),
    ];
  }

  const issues: Issue[] = [];

  // D-5: Detect schema type — existence-based precedence (not validness-based)
  const hasNamespaced = hasNamespacedRecommendationBlock(parsed);
  const hasTopLevel = hasLegacyRecommendationKeys(parsed);

  if (hasNamespaced && hasTopLevel) {
    issues.push(
      issue(
        "QFAI-PROT-232",
        "prototyping.yaml に namespaced と top-level の両方の recommendation block があります。namespaced が優先されます。",
        "warning",
        targetPath,
        "prototypingRecommendation.conflictingSchemas",
        undefined,
        "compatibility",
        "top-level の recommended_mode / rationale / allowed_modes / surface を削除し、prototyping.* namespaced 形式に統一してください。",
      ),
    );
  }

  // D-5: When namespaced key exists, always use it (even if invalid).
  // Valid legacy fallback is only allowed when namespaced key does not exist.
  if (hasNamespaced && !isPlainRecord(parsed.prototyping)) {
    // Non-object namespaced block — invalid, no legacy fallback
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の prototyping キーが object ではありません。namespaced block は plain object である必要があります。",
        "error",
        targetPath,
        "prototypingRecommendation.schema",
        undefined,
        "compatibility",
        "prototyping:\n  recommended_mode: ...\n  rationale: ...\n  allowed_modes: [...]\n  surface: ...\nの形式に書き換えてください。",
      ),
    );
    return issues;
  }

  const namespacedBlock = hasNamespaced ? (parsed.prototyping as Record<string, unknown>) : null;
  const block = namespacedBlock ?? parsed;
  const isLegacy = !hasNamespaced && hasTopLevel;

  if (isLegacy) {
    issues.push(
      issue(
        "QFAI-PROT-231",
        "prototyping.yaml が deprecated な top-level schema を使用しています。prototyping.* namespaced 形式に移行してください。",
        "warning",
        targetPath,
        "prototypingRecommendation.deprecatedTopLevel",
        undefined,
        "compatibility",
        "prototyping:\n  recommended_mode: ...\n  rationale: ...\n  allowed_modes: [...]\n  surface: ...\nの形式に書き換えてください。",
      ),
    );
  }

  const recommendedMode = block.recommended_mode;
  const rationale = block.rationale;
  const allowedModes = block.allowed_modes;
  const surface = block.surface;

  if (typeof recommendedMode !== "string" || !VALID_MODES.has(recommendedMode)) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の recommended_mode が不正です。",
        "error",
        targetPath,
        "prototypingRecommendation.recommendedMode",
        undefined,
        "compatibility",
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
        "compatibility",
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
        "compatibility",
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
        "compatibility",
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
        "compatibility",
        "surface は web-ui|mobile-ui|desktop-ui|mixed|non-ui のいずれかで必須です。",
      ),
    );
  } else if (typeof surface !== "string" || !VALID_SURFACES.has(surface)) {
    issues.push(
      issue(
        "QFAI-PROT-153",
        "prototyping.yaml の surface が不正です。",
        "error",
        targetPath,
        "prototypingRecommendation.surface",
        undefined,
        "compatibility",
        "surface は web-ui|mobile-ui|desktop-ui|mixed|non-ui のいずれかにしてください。",
      ),
    );
  }

  if (
    normalizedAllowedModes &&
    typeof recommendedMode === "string" &&
    VALID_MODES.has(recommendedMode) &&
    !normalizedAllowedModes.includes(recommendedMode)
  ) {
    issues.push(
      issue(
        "QFAI-PROT-154",
        "allowed_modes は recommended_mode を含む必要があります。",
        "error",
        targetPath,
        "prototypingRecommendation.allowedModesContainsRecommended",
        [`recommended_mode=${recommendedMode}`],
        "compatibility",
        "allowed_modes に recommended_mode を追加してください。",
      ),
    );
  }

  return issues;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
