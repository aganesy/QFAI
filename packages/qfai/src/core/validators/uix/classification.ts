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
import {
  DESIGN_DIRECTION_VALUES,
  findInheritanceConflicts,
  readDesignDirectionDeclaration,
} from "./designInheritance.js";

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

export async function validateClassification(
  root: string,
  config: QfaiConfig,
  projectRoot?: string,
): Promise<Issue[]> {
  const contextPath = path.join(root, "01_Context.md");
  const content = await readSafe(contextPath);
  if (!content) {
    return [];
  }

  const classification = parseClassificationBlock(content);
  if (!classification) {
    return [
      classificationIssue(
        "QFAI-CLASSIFICATION-006",
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
        "QFAI-CLASSIFICATION-008",
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
        "QFAI-CLASSIFICATION-003",
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
        "QFAI-CLASSIFICATION-005",
        `primary_surface '${classification.primarySurfaceRaw}' is invalid. Valid values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
        "error",
        "01_Context.md",
        `Set primary_surface to one of: ${VALID_PRIMARY_SURFACES.join(", ")}`,
      ),
    );
  }

  const primarySurface = classification.primarySurface;
  const uiBearing = classification.uiBearing;
  if (classification.invalidSecondarySurfaces.length > 0) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-004",
        `secondary_surfaces contains invalid value(s): ${classification.invalidSecondarySurfaces.join(", ")}. Valid values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
        "error",
        "01_Context.md",
        `Replace invalid secondary_surfaces values with canonical values: ${VALID_PRIMARY_SURFACES.join(", ")}`,
      ),
    );
  }

  if (classification.duplicateSecondarySurfaces.length > 0) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-002",
        `secondary_surfaces contains duplicate value(s): ${classification.duplicateSecondarySurfaces.join(", ")}`,
        "error",
        "01_Context.md",
        "Remove duplicate entries from secondary_surfaces.",
      ),
    );
  }

  if (uiBearing === true && primarySurface && DISCUSSION_NON_UI_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-001",
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
        "QFAI-CLASSIFICATION-001",
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
        "QFAI-CLASSIFICATION-010",
        `secondary_surfaces contains the primary_surface '${primarySurface}'.`,
        "error",
        "01_Context.md",
        `Remove '${primarySurface}' from secondary_surfaces.`,
      ),
    );
  }

  if (uiBearing === false && primarySurface && !DISCUSSION_NON_UI_SURFACES.has(primarySurface)) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-001",
        `ui_bearing is false but primary_surface is '${primarySurface}'. primary_surface must be 'non-ui' when ui_bearing=false.`,
        "error",
        "01_Context.md",
        "Set primary_surface to non-ui when ui_bearing=false.",
      ),
    );
  }

  if (uiBearing === false && classification.secondarySurfacesRawEntries.length > 0) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-001",
        `ui_bearing is false but secondary_surfaces is not empty: ${classification.secondarySurfacesRawEntries.join(", ")}`,
        "error",
        "01_Context.md",
        "Set secondary_surfaces to an explicit empty list when ui_bearing=false.",
      ),
    );
  }

  if (uiBearing === true && primarySurface === "non-ui") {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-001",
        "ui_bearing is true but primary_surface is 'non-ui'.",
        "error",
        "01_Context.md",
        "Set primary_surface to web, mobile, desktop, cli, or mixed when ui_bearing=true.",
      ),
    );
  }

  if (uiBearing === true && classification.secondarySurfaces.includes("non-ui")) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-001",
        "ui_bearing is true but secondary_surfaces contains 'non-ui'.",
        "error",
        "01_Context.md",
        "Remove non-ui from secondary_surfaces when ui_bearing=true.",
      ),
    );
  }

  if (classification.secondarySurfacesRaw === undefined) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-009",
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
        "QFAI-CLASSIFICATION-007",
        "classification_rationale must contain substantive project-specific reasoning.",
        "error",
        "01_Context.md",
        "Replace classification_rationale placeholder text with concrete reasoning.",
      ),
    );
  }

  const designDirection = readDesignDirectionDeclaration(content);
  if (designDirection.kind === "invalid") {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-011",
        `design_direction '${designDirection.value}' is invalid. Valid values: ${DESIGN_DIRECTION_VALUES.join(", ")}`,
        "error",
        "01_Context.md",
        `Set design_direction to one of: ${DESIGN_DIRECTION_VALUES.join(", ")}`,
      ),
    );
  }
  if (designDirection.kind === "inherit") {
    issues.push(...(await inheritanceRefusals(root, content, config, projectRoot)));
  }

  return issues;
}

/** One error per reason the pack may not inherit the current `DESIGN.md`. */
async function inheritanceRefusals(
  root: string,
  content: string,
  config: QfaiConfig,
  projectRoot: string | undefined,
): Promise<Issue[]> {
  const { newScreens, directionFields } = await findInheritanceConflicts(
    root,
    content,
    config,
    projectRoot,
  );
  const issues: Issue[] = [];
  if (newScreens.length > 0) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-011",
        `design_direction: inherit is declared, but uiux/40_screen_contracts.md names screen_id values that match no screens[].id in the project's UI contracts: ${newScreens.join(", ")}. A pack that adds a screen cannot inherit the current DESIGN.md.`,
        "error",
        "01_Context.md",
        "Remove design_direction: inherit and complete the design research, or keep the pack to existing screens.",
      ),
    );
  }
  if (directionFields.length > 0) {
    issues.push(
      classificationIssue(
        "QFAI-CLASSIFICATION-011",
        `design_direction: inherit is declared, but 01_Context.md#Design Direction records a direction of its own: ${directionFields.join(", ")}. A pack that changes DESIGN.md cannot inherit it.`,
        "error",
        "01_Context.md",
        "Remove design_direction: inherit, or clear the Design Direction fields so the pack keeps the current DESIGN.md.",
      ),
    );
  }
  return issues;
}
