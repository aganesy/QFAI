/**
 * The test-layer policy, read from the artifact that calls itself its SSOT.
 *
 * `catalog/test-layers.md` describes itself as "the SSOT for ATDD test-layer
 * semantics and completion gates", but the only consumer of the set it declares
 * was `validateSpecPackEntry` — the **legacy** `spec-pack` branch.
 * `validateLayeredSpecEntry`, the branch that runs on the layout `qfai init` and
 * `/qfai-sdd` actually produce, took no tag argument at all, and `tddList.ts`
 * judged the ledger's `Layer` column against a hardcoded set. So on every
 * modern project the policy file was read, reported on, and then ignored.
 *
 * This module is the shared reader. `validators/specPack.ts` and
 * `validators/tddList.ts` both resolve their allowed set through it, so the
 * shipped file is the SSOT for the layout in use rather than for the one that
 * is not.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { resolveAllowedLayerTagsFromPolicy } from "./specPackParsers.js";
import { LAYER_TAGS } from "./testStrategyTags.js";
import type { Issue } from "./types.js";
import { issue } from "./validators/utils.js";

export type LayerPolicyResult = {
  /** Allowed `layer-*` tags. Falls back to the built-in set when unreadable. */
  tags: Set<string>;
  /** Where `tags` came from — reported so a fall-open is never silent. */
  source: "policy-file" | "built-in-default";
  issues: Issue[];
};

/** `layer-integration` -> `integration`, the spelling the ledger's `Layer` uses. */
export function layerNamesFromTags(tags: ReadonlySet<string>): Set<string> {
  return new Set(Array.from(tags, (tag) => tag.replace(/^layer-/, "")));
}

/**
 * Reports a policy file whose declared layers disagree with the built-in set.
 *
 * Without this the two can drift silently in either direction: a layer added to
 * the policy is not enforced anywhere, and one removed from it still passes,
 * because several code paths keep their own copy. The file cannot be an SSOT
 * while a second source is free to disagree with it.
 */
function reportPolicyDrift(tags: ReadonlySet<string>, policyPath: string): Issue[] {
  const declared = Array.from(tags).sort();
  const builtIn = Array.from(LAYER_TAGS).sort();
  if (declared.join(",") === builtIn.join(",")) {
    return [];
  }
  const onlyInPolicy = declared.filter((tag) => !LAYER_TAGS.has(tag));
  const onlyInCode = builtIn.filter((tag) => !tags.has(tag));
  return [
    issue(
      "QFAI-SPACK-091",
      `test-layer policy と組み込みの layer 集合が一致しません。policy のみ: ${
        onlyInPolicy.join(", ") || "(なし)"
      } / 組み込みのみ: ${onlyInCode.join(", ") || "(なし)"}`,
      "warning",
      policyPath,
      "specPack.layerPolicyDrift",
      [...onlyInPolicy, ...onlyInCode],
      "change",
      "`catalog/test-layers.md` の `## Layer definitions` を SSOT として、両者を一致させてください。",
    ),
  ];
}

export async function loadLayerPolicy(
  root: string,
  config: QfaiConfig,
): Promise<LayerPolicyResult> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantRoot = path.dirname(skillsDir);
  const canonicalPath = path.join(assistantRoot, "catalog", "test-layers.md");
  const legacyPath = path.join(assistantRoot, "steering", "test-layers.md");

  for (const policyPath of [canonicalPath, legacyPath]) {
    let policyText: string;
    try {
      policyText = await readFile(policyPath, "utf-8");
    } catch {
      continue;
    }
    const tags = resolveAllowedLayerTagsFromPolicy(policyText);
    if (tags.size === 0) {
      // A silent widen is indistinguishable from a pass, so say so.
      return {
        tags: new Set(Array.from(LAYER_TAGS)),
        source: "built-in-default",
        issues: [
          issue(
            "QFAI-SPACK-090",
            "test-layer policy を読み取れましたが layer タグを抽出できませんでした。既定の layer タグ集合を使用します。",
            "error",
            policyPath,
            "specPack.layerPolicy",
            undefined,
            "change",
            "`catalog/test-layers.md` の `## Layer definitions` 見出し（例: `### L3 Integration`）または `layer-*` タグを確認してください。",
          ),
        ],
      };
    }
    return { tags, source: "policy-file", issues: reportPolicyDrift(tags, policyPath) };
  }

  return {
    tags: new Set(Array.from(LAYER_TAGS)),
    source: "built-in-default",
    issues: [
      issue(
        "QFAI-SPACK-090",
        "test-layer policy が見つからないため既定の layer タグ集合を使用します。",
        "error",
        canonicalPath,
        "specPack.layerPolicy",
        undefined,
        "change",
        "`npx qfai init` を再実行して `catalog/test-layers.md` を配置してください。",
      ),
    ],
  };
}
