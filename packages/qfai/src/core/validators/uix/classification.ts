import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import {
  type SurfaceType,
  DISCUSSION_NON_UI_SURFACES,
  DISCUSSION_UI_BEARING_SURFACES,
  parseClassificationBlock,
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
  const contextPath = path.join(root, "01_Context.md");
  const content = await readSafe(contextPath);
  if (!content) {
    return [];
  }

  const classification = parseClassificationBlock(content);
  if (!classification) {
    return [
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-MISSING",
        "01_Context.md must contain the explicit UI-bearing Classification block.",
        "error",
        "01_Context.md",
        "Add ui_bearing, primary_surface, secondary_surfaces, and classification_rationale to the classification block.",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const field of classification.missingFields) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD",
        `UI-bearing Classification is missing required field '${field}'.`,
        "error",
        "01_Context.md",
        `Add '${field}' to the classification block in 01_Context.md.`,
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

  if (
    classification.primarySurfaceRaw &&
    !classification.primarySurface &&
    !classification.missingFields.includes("primary_surface")
  ) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
        `primary_surface '${classification.primarySurfaceRaw}' is invalid. Valid values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
        "error",
        "01_Context.md",
        `Set primary_surface to one of: ${VALID_PRIMARY_SURFACES.join(", ")}`,
      ),
    );
  }

  const primarySurface = classification.primarySurface;
  const uiBearing = classification.uiBearing;
  if (uiBearing === true && primarySurface && DISCUSSION_NON_UI_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-CONTRADICTION",
        `ui_bearing is true but primary_surface is '${primarySurface}'. ui_bearing=true requires a discussion UI-bearing surface (${[...DISCUSSION_UI_BEARING_SURFACES].join(", ")}).`,
        "error",
        "01_Context.md",
        "Set primary_surface to a UI-bearing surface or change ui_bearing to false.",
      ),
    );
  }

  if (uiBearing === false && primarySurface && DISCUSSION_UI_BEARING_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-CONTRADICTION",
        `ui_bearing is false but primary_surface is '${primarySurface}'. ui_bearing=false requires primary_surface 'non-ui'.`,
        "error",
        "01_Context.md",
        "Set primary_surface to non-ui or change ui_bearing to true.",
      ),
    );
  }

  if (primarySurface && classification.secondarySurfaces.includes(primarySurface)) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE",
        `secondary_surfaces contains the primary_surface '${primarySurface}'.`,
        "error",
        "01_Context.md",
        `Remove '${primarySurface}' from secondary_surfaces.`,
      ),
    );
  }

  if (classification.secondarySurfacesRaw === undefined) {
    issues.push(
      classificationIssue(
        "UIX-VAL-CLASSIFICATION-SECONDARY-ARRAY",
        "secondary_surfaces is required and must be present even when empty.",
        "error",
        "01_Context.md",
        "Declare secondary_surfaces as a bullet list or explicit empty list.",
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
