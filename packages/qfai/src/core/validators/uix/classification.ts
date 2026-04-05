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
  parseClassificationBlock,
  isUiBearingSurface,
  UI_BEARING_SURFACES,
  NON_UI_SURFACES,
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
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|none)$/i;

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

export async function validateClassification(root: string, _config: QfaiConfig): Promise<Issue[]> {
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

  for (const field of classification.missingFields) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD",
        `UI-bearing Classification is missing required field '${field}'.`,
        "error",
        "01_Context.md",
        `Add '${field}' to the '## UI-bearing Classification' block in 01_Context.md.`,
      ),
    );
  }

  if (classification.uiBearing === undefined) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-INVALID-BOOLEAN",
        "ui_bearing must be true or false.",
        "error",
        "01_Context.md",
        "Set ui_bearing to true or false.",
      ),
    );
  }

  // Validate: primary_surface must be a valid enum
  if (
    classification.primarySurfaceRaw &&
    !classification.primarySurface &&
    !classification.missingFields.includes("primary_surface")
  ) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
        `primary_surface '${classification.primarySurfaceRaw}' is not a valid canonical surface type. Valid values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
        "error",
        "01_Context.md",
        `Set primary_surface to one of: ${VALID_PRIMARY_SURFACES.join(", ")}`,
      ),
    );
  }

  const primarySurface = classification.primarySurface;
  const uiBearing = classification.uiBearing;

  // Canonical contradiction: ui_bearing=true with non-ui surface (cli, non-ui)
  if (uiBearing === true && primarySurface && NON_UI_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-CONTRADICTION",
        `ui_bearing is true but primary_surface is '${primarySurface}'. ui_bearing=true requires a UI surface (${[...UI_BEARING_SURFACES].join(", ")}).`,
        "error",
        "01_Context.md",
        `Set primary_surface to a UI surface type (${[...UI_BEARING_SURFACES].join(", ")}) when ui_bearing is true, or set ui_bearing to false.`,
      ),
    );
  }

  // Canonical contradiction: ui_bearing=false with UI-bearing surface
  if (uiBearing === false && primarySurface && UI_BEARING_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-CONTRADICTION",
        `ui_bearing is false but primary_surface is '${primarySurface}'. ui_bearing=false requires a non-UI surface (${[...NON_UI_SURFACES].join(", ")}).`,
        "error",
        "01_Context.md",
        `Set ui_bearing to true when primary_surface is '${primarySurface}', or change primary_surface to a non-UI value.`,
      ),
    );
  }

  // secondary_surfaces should not duplicate primary_surface
  if (primarySurface && classification.secondarySurfaces.includes(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE",
        `secondary_surfaces contains the primary_surface '${primarySurface}'. primary_surface should not be repeated in secondary_surfaces.`,
        "error",
        "01_Context.md",
        `Remove '${primarySurface}' from secondary_surfaces.`,
      ),
    );
  }

  if (
    classification.classificationRationaleRaw !== undefined &&
    (classification.classificationRationaleRaw.trim().length === 0 ||
      PLACEHOLDER_RE.test(classification.classificationRationaleRaw.trim()))
  ) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER",
        "classification_rationale must contain substantive project-specific reasoning.",
        "error",
        "01_Context.md",
        "Replace classification_rationale placeholder text with concrete reasoning.",
      ),
    );
  }

  return issues;
}
