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
import { exists, readSafe } from "../utils.js";

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
      relPath = "uiux/2[0-3]_design_eval_*.md";
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

  // Pure 4-axis format is a canonical violation in v1.7.14.
  // Use the 3-layer model (invariant / trend-derived / product-specific).
  if (hasFourAxis && !hasThreeLayer) {
    return [
      threeLayerIssue(
        "UIX-VAL-3LAYER-LEGACY-FORMAT",
        "Legacy 4-axis evaluation format is not allowed in v1.7.14; use canonical 3-layer evaluation.",
        "error",
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
  "30_comparison.md",
  "31_anchor.md",
  "40_contracts.md",
  "50_review_bundle.md",
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
    const fileExists = await exists(path.join(root, "uiux", forbidden));
    if (fileExists) {
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
 * Required files for canonical sidecar family completeness.
 * Note: 24_design_eval_dynamic_overrides.md is OPTIONAL per design spec.
 */
const CANONICAL_REQUIRED_SIDECAR_FILES = [
  "00_index.md",
  "10_implementation_strategy.md",
  "11_design_taste_interview.md",
  "20_design_eval_invariant.md",
  "21_design_eval_trend_derived.md",
  "22_design_eval_product_specific.md",
  "23_design_eval_aggregate.md",
  "30_option_comparison.md",
  "31_selected_anchor_screen.md",
  "40_screen_contracts.md",
  "50_review_input_bundle.md",
];

/**
 * Validate canonical sidecar family completeness — all required files must exist.
 * Note: despite the function name, this validates the entire canonical sidecar
 * family, not just the 3-layer evaluation files.
 *
 * @see validateCanonicalSidecarFamilyCompleteness — preferred alias
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
  for (const required of CANONICAL_REQUIRED_SIDECAR_FILES) {
    const content = await readSafe(path.join(root, "uiux", required));
    if (!content) {
      issues.push(
        threeLayerIssue(
          "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
          `Required canonical sidecar file missing: uiux/${required}.`,
          "error",
          `uiux/${required}`,
          `Create uiux/${required} using the canonical template.`,
        ),
      );
    }
  }
  return issues;
}

/** Preferred alias - validates the full canonical sidecar family, not just 3-layer. */
export const validateCanonicalSidecarFamilyCompleteness = validateThreeLayerFamilyCompleteness;
