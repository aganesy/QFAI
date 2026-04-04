/**
 * UIX-VAL classification validator — v1.7.13
 *
 * Validates the explicit UI-bearing classification block in 01_Context.md.
 * This validator runs before sidecar presence checks to establish the
 * primary truth for UI-bearing detection.
 *
 * Rules:
 * - UI-bearing project must have a classification block
 * - ui_bearing=true with primary_surface=non-ui is forbidden
 * - ui_bearing=false should not trigger required uiux/ sidecar validation
 * - primary_surface must be a valid canonical enum value
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import {
  type SurfaceType,
  type UiBearingClassification,
  parseClassificationBlock,
  isUiBearingSurface,
} from "../../detection/surfaceType.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { readSafe } from "../utils.js";

const VALID_PRIMARY_SURFACES: SurfaceType[] = [
  "web",
  "mobile",
  "desktop",
  "cli",
  "mixed",
  "non-ui",
];

function classificationIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

export async function validateClassification(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  const contextPath = path.join(root, "01_Context.md");
  const content = await readSafe(contextPath);
  if (!content) return [];

  const classification = parseClassificationBlock(content);

  // If the spec is detected as UI-bearing by heuristics but has no classification block, error
  const isUiBearing = await isUiBearingSurface(root);
  if (isUiBearing && !classification) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-MISSING",
        "UI-bearing spec detected but 01_Context.md is missing the explicit UI-bearing Classification block.",
        "error",
        "01_Context.md",
        "Add the '## UI-bearing Classification' section with ui_bearing, primary_surface, secondary_surfaces, and classification_rationale fields to 01_Context.md.",
      ),
    );
    return issues;
  }

  if (!classification) return [];

  // Validate: ui_bearing=true with primary_surface=non-ui is forbidden
  if (classification.ui_bearing && classification.primary_surface === "non-ui") {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-CONTRADICTION",
        "ui_bearing is true but primary_surface is non-ui. This combination is forbidden.",
        "error",
        "01_Context.md",
        "Set primary_surface to a UI surface type (web, mobile, desktop, cli, mixed) when ui_bearing is true.",
      ),
    );
  }

  // Validate: primary_surface must be a valid enum
  if (!VALID_PRIMARY_SURFACES.includes(classification.primary_surface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
        `primary_surface '${classification.primary_surface}' is not a valid canonical surface type. Valid values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
        "error",
        "01_Context.md",
        `Set primary_surface to one of: ${VALID_PRIMARY_SURFACES.join(", ")}`,
      ),
    );
  }

  return issues;
}
