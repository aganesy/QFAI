import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

// Brand-level inputs (product intent / brand signals / anti-goals / reference
// pool) live in root DESIGN.md and are validated separately via
// designContractReadiness. The required family holds only the screen-level UX
// sidecars.
//
// Exported so the shipped-template sweep in
// `tests/integration/discussionSkillTemplateIntegration.test.ts` can check the
// family that `qfai-discussion/SKILL.md` declares against this list rather than
// letting the entry point drift away from what `qfai validate` requires.
export const CANONICAL_REQUIRED_SIDECAR_FILES = [
  "00_index.md",
  "40_screen_contracts.md",
  "50_review_input_bundle.md",
] as const;

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
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

export async function validateThreeLayerFamilyCompleteness(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  // `00_index.md` is the first entry of the required family, so it is reported
  // by the loop like any other member. Reading it up front and returning clean
  // on absence made the gate unable to report the very file it triggered on —
  // and disabled the checks for the other two members along with it.
  // `isUiBearingSpec` above is what scopes this check.
  const issues: Issue[] = [];
  for (const required of CANONICAL_REQUIRED_SIDECAR_FILES) {
    const content = await readSafe(path.join(root, "uiux", required));
    if (!content) {
      issues.push(
        threeLayerIssue(
          "QFAI-THREELAYER-002",
          `Required canonical sidecar file missing: uiux/${required}.`,
          "error",
          `uiux/${required}`,
          `Create uiux/${required} using the exploration-first template.`,
        ),
      );
    }
  }
  return issues;
}

export const validateCanonicalSidecarFamilyCompleteness = validateThreeLayerFamilyCompleteness;
