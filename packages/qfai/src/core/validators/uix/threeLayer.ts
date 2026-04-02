/**
 * UIX-VAL 3-layer evaluation model validator — spec-0034
 *
 * Validates that evaluation axes use the 3-layer model
 * (invariant / trend-derived / product-specific) and detects
 * legacy 4-axis format or mixed formats.
 *
 * BR-0034-0009, BR-0034-0010, BR-0034-0011
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const THREE_LAYER_SECTIONS = new Set(["invariant", "trend-derived", "product-specific"]);
const FOUR_AXIS_SECTIONS = new Set(["usability", "consistency", "accessibility", "delight"]);

function threeLayerIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

export async function validateThreeLayerModel(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Read eval axes from single file or split files
  const singlePath = path.join(root, "uiux", "20_eval_axes.md");
  let content = await readSafe(singlePath);
  let relPath = "uiux/20_eval_axes.md";

  if (!content) {
    const splitFiles = [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ];
    const parts: string[] = [];
    for (const f of splitFiles) {
      const c = await readSafe(path.join(root, "uiux", f));
      if (c) parts.push(c);
    }
    if (parts.length > 0) {
      content = parts.join("\n");
      relPath = "uiux/20_design_eval_*.md";
    }
  }

  if (!content) return [];

  // Extract top-level section headings (## heading)
  const headings: string[] = [];
  for (const line of content.split("\n")) {
    const match = /^##\s+(\S+)/.exec(line);
    if (match?.[1]) {
      headings.push(match[1].toLowerCase());
    }
  }

  const hasThreeLayer = headings.some((h) => THREE_LAYER_SECTIONS.has(h));
  const hasFourAxis = headings.some((h) => FOUR_AXIS_SECTIONS.has(h));

  if (hasThreeLayer && hasFourAxis) {
    const fourAxisNames = headings.filter((h) => FOUR_AXIS_SECTIONS.has(h));
    return [
      threeLayerIssue(
        "UIX-VAL-3LAYER-MIXED-FORMAT",
        `Inconsistent evaluation model: mixed 3-layer and 4-axis sections found. 4-axis sections: ${fourAxisNames.join(", ")}`,
        "error",
        relPath,
        "Convert all evaluation axes to the 3-layer model (invariant / trend-derived / product-specific).",
      ),
    ];
  }

  if (hasFourAxis && !hasThreeLayer) {
    return [
      threeLayerIssue(
        "UIX-VAL-3LAYER-LEGACY-FORMAT",
        "4-axis evaluation format detected (usability/consistency/accessibility/delight). Upgrade to 3-layer model.",
        "warning",
        relPath,
        "Migrate evaluation axes to 3-layer model: invariant, trend-derived, product-specific.",
      ),
    ];
  }

  return [];
}

/**
 * Forbidden legacy files that must not exist in a 3-layer canonical sidecar.
 */
const FORBIDDEN_LEGACY_FILES = [
  "31_anchor.md",
  "60_critique_loop.md",
  "20_eval_axis_usability.md",
  "21_eval_axis_consistency.md",
  "22_eval_axis_accessibility.md",
  "23_eval_axis_delight.md",
];

/**
 * Validate that no forbidden legacy files exist in the uiux/ sidecar directory.
 */
export async function validateForbiddenLegacyFiles(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];
  for (const forbidden of FORBIDDEN_LEGACY_FILES) {
    const content = await readSafe(path.join(root, "uiux", forbidden));
    if (content) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-FORBIDDEN-FILE",
          `Forbidden legacy file detected: uiux/${forbidden}. This file is no longer part of the 3-layer canonical family.`,
          "error",
          `uiux/${forbidden}`,
          `Remove uiux/${forbidden} and migrate content to the appropriate 3-layer file.`,
        ),
      );
    }
  }
  return issues;
}

/**
 * Required files for 3-layer family completeness.
 */
const THREE_LAYER_REQUIRED_FILES = ["24_design_eval_dynamic_overrides.md"];

/**
 * Validate 3-layer family completeness — required new files must exist.
 */
export async function validateThreeLayerFamilyCompleteness(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // Only check if the uiux directory exists (sidecar present)
  const indexContent = await readSafe(path.join(root, "uiux", "00_index.md"));
  if (!indexContent) return [];

  const issues: Issue[] = [];
  for (const required of THREE_LAYER_REQUIRED_FILES) {
    const content = await readSafe(path.join(root, "uiux", required));
    if (!content) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
          `Required 3-layer file missing: uiux/${required}. The 3-layer family is incomplete.`,
          "error",
          `uiux/${required}`,
          `Create uiux/${required} using the canonical template.`,
        ),
      );
    }
  }
  return issues;
}
