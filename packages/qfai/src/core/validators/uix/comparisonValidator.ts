import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

function canonicalIssue(
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

export async function validateExplorationArtifacts(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];
  const rubricPath = path.join(root, "uiux", "33_exploration_rubric.md");
  const calibrationPath = path.join(root, "uiux", "34_evaluator_calibration.md");
  const reviewBundlePath = path.join(root, "uiux", "50_review_input_bundle.md");

  const rubricContent = await readSafe(rubricPath);
  if (!rubricContent) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-DIRECTION-RUBRIC-MISSING",
        "33_exploration_rubric.md is required for evaluation-driven prototyping.",
        "error",
        "uiux/33_exploration_rubric.md",
        "Create uiux/33_exploration_rubric.md with informationArchitecture, navigationFlow, usability, and functionality axes.",
      ),
    );
  } else {
    for (const term of [
      "Information Architecture",
      "Navigation Flow",
      "Usability",
      "Functionality",
    ]) {
      if (!new RegExp(term, "i").test(rubricContent)) {
        issues.push(
          canonicalIssue(
            "UIX-VAL-DIRECTION-RUBRIC-INCOMPLETE",
            `33_exploration_rubric.md is missing '${term}'.`,
            "error",
            "uiux/33_exploration_rubric.md",
            `Add ${term} to uiux/33_exploration_rubric.md.`,
          ),
        );
      }
    }
  }

  const calibrationContent = await readSafe(calibrationPath);
  if (!calibrationContent) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-EVALUATOR-CALIBRATION-MISSING",
        "34_evaluator_calibration.md is required to keep the evaluator skeptical and aligned.",
        "error",
        "uiux/34_evaluator_calibration.md",
        "Create uiux/34_evaluator_calibration.md with good-critique and too-lenient examples.",
      ),
    );
  } else {
    for (const term of ["Good Critique", "Too Lenient"]) {
      if (!new RegExp(term, "i").test(calibrationContent)) {
        issues.push(
          canonicalIssue(
            "UIX-VAL-EVALUATOR-CALIBRATION-INCOMPLETE",
            `34_evaluator_calibration.md is missing '${term}'.`,
            "error",
            "uiux/34_evaluator_calibration.md",
            `Add ${term} examples to uiux/34_evaluator_calibration.md.`,
          ),
        );
      }
    }
  }

  const reviewBundleContent = await readSafe(reviewBundlePath);
  if (reviewBundleContent && !/best-of-history/i.test(reviewBundleContent)) {
    issues.push(
      canonicalIssue(
        "UIX-VAL-DIRECTION-HISTORY-MISSING",
        "50_review_input_bundle.md must document best-of-history review handling.",
        "warning",
        "uiux/50_review_input_bundle.md",
        "Document that later iterations are not automatically preferred over earlier stronger directions.",
      ),
    );
  }

  return issues;
}

export { validateExplorationArtifacts as validateOptionComparison };
