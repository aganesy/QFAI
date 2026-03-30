/**
 * Migration format detection validator — spec-0037
 *
 * Detects pack format version and provides upgrade guidance.
 * Version 1: no uiux/ directory (old no-sidecar)
 * Version 2: uiux/ with 4-axis model (intermediate v1.7.6-v1.7.7)
 * Version 3: uiux/ with 3-layer model (current v1.7.8)
 *
 * BR-0037-0007, BR-0037-0008, BR-0037-0009, BR-0037-0010
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import type { Issue, IssueSeverity } from "../../types.js";
import { readSafe } from "../utils.js";

export type FormatVersion = 1 | 2 | 3 | "unknown";

export type FormatDetectionResult = {
  version: FormatVersion;
  issues: Issue[];
  upgradeGuidance?: string;
  staleAsset?: boolean;
  staleTimestamp?: string;
};

const THREE_LAYER_SECTIONS = ["invariant", "trend-derived", "product-specific"];
const FOUR_AXIS_SECTIONS = ["usability", "consistency", "accessibility", "delight"];

function migrationIssue(
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

function buildUpgradeGuidance(version: FormatVersion): string {
  if (version === 1) {
    return [
      `Detected version: ${version} (no-sidecar format)`,
      "Target version: 3 (v1.7.8 3-layer model)",
      "Migration steps:",
      "  1. Create uiux/ sidecar directory",
      "  2. Run design taste interview to populate 11_design_taste_interview.md",
      "  3. Run trend scan to populate 04_Sources.md with Trend Scan section",
      "  4. Create evaluation axes in 3-layer format (invariant/trend-derived/product-specific)",
      "  5. Populate scoring-ready schema with 16 mandatory fields per axis",
      "Affected files: uiux/, 04_Sources.md, evaluation axes files",
    ].join("\n");
  }

  if (version === 2) {
    return [
      `Detected version: ${version} (intermediate 4-axis format)`,
      "Target version: 3 (v1.7.8 3-layer model)",
      "Migration steps:",
      "  1. Convert 4-axis (usability/consistency/accessibility/delight) to 3-layer (invariant/trend-derived/product-specific)",
      "  2. Add source_translation to each trend-derived axis",
      "  3. Populate scoring-ready schema with 16 mandatory fields per axis",
      "  4. Run taste interview if 11_design_taste_interview.md is missing",
      "Affected files: uiux/20_eval_axes.md or split axis files",
    ].join("\n");
  }

  return "Unknown format; manual inspection required.";
}

/**
 * Detect the format version of a discussion/spec pack.
 */
export async function detectFormatVersion(
  root: string,
  severity: IssueSeverity = "warning",
): Promise<FormatDetectionResult> {
  // Check for uiux/ directory
  let hasUiux = false;
  try {
    await readdir(path.join(root, "uiux"));
    hasUiux = true;
  } catch {
    // no uiux directory
  }

  if (!hasUiux) {
    // Check if this is a spec pack at all (has 01_Spec.md or 01_Context.md)
    const specContent = await readSafe(path.join(root, "01_Spec.md"));
    const contextContent = await readSafe(path.join(root, "01_Context.md"));
    if (!specContent && !contextContent) {
      return {
        version: "unknown",
        issues: [
          migrationIssue(
            "UIX-VAL-MIGRATION-UNKNOWN-FORMAT",
            "Unrecognized pack format: no 01_Spec.md or 01_Context.md found.",
            "error",
            root,
            "Verify this is a valid QFAI discussion or spec pack.",
          ),
        ],
      };
    }

    // Version 1: no uiux/ directory
    const guidance = buildUpgradeGuidance(1);
    return {
      version: 1,
      staleAsset: true,
      issues: [
        migrationIssue(
          "UIX-VAL-MIGRATION-OLD-FORMAT",
          "Old no-sidecar format (version 1) detected. Upgrade to v1.7.8 3-layer model.",
          severity,
          "uiux/",
          guidance,
        ),
      ],
      upgradeGuidance: guidance,
    };
  }

  // Has uiux/ — check axis model format
  const axesPath = path.join(root, "uiux", "20_eval_axes.md");
  let axesContent = await readSafe(axesPath);

  if (!axesContent) {
    const splitFiles = [
      "20_eval_axis_usability.md",
      "21_eval_axis_consistency.md",
      "22_eval_axis_accessibility.md",
      "23_eval_axis_delight.md",
    ];
    const parts: string[] = [];
    for (const f of splitFiles) {
      const c = await readSafe(path.join(root, "uiux", f));
      if (c) parts.push(c);
    }
    axesContent = parts.join("\n");
  }

  // Extract headings
  const headings: string[] = [];
  for (const line of axesContent.split("\n")) {
    const match = /^##\s+(\S+)/.exec(line);
    if (match?.[1]) headings.push(match[1].toLowerCase());
  }

  const hasThreeLayer = headings.some((h) => THREE_LAYER_SECTIONS.includes(h));
  const hasFourAxis = headings.some((h) => FOUR_AXIS_SECTIONS.includes(h));

  if (hasThreeLayer && !hasFourAxis) {
    // Version 3: current format
    return { version: 3, issues: [] };
  }

  if (hasFourAxis) {
    // Version 2: intermediate format
    const guidance = buildUpgradeGuidance(2);
    return {
      version: 2,
      staleAsset: true,
      issues: [
        migrationIssue(
          "UIX-VAL-MIGRATION-INTERMEDIATE-FORMAT",
          "Intermediate 4-axis format (version 2) detected. Upgrade to 3-layer model.",
          severity,
          "uiux/20_eval_axes.md",
          guidance,
        ),
      ],
      upgradeGuidance: guidance,
    };
  }

  // Has uiux/ but no recognizable axis format — could be v3 without axes yet
  return { version: 3, issues: [] };
}
