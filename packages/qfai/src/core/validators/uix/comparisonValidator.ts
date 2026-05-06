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
  // The legacy `33_exploration_rubric.md` and `34_evaluator_calibration.md`
  // sidecars were removed when DESIGN.md became the brand SSOT and the
  // evaluator axes were fixed in `core/prototyping/evaluatorReview.ts`
  // (`ORDINAL_AXES`). Validating discussion packs against those deleted
  // template files would fail every freshly-generated pack from the
  // current workflow.
  const reviewBundlePath = path.join(root, "uiux", "50_review_input_bundle.md");

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
