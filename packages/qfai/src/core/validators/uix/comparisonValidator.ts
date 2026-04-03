/**
 * Canonical UIX comparison validator — v1.7.13
 *
 * Validates option comparison completeness and anchor selection in 30_comparison.md.
 * Moved from legacy/uixCompatibility.ts to establish canonical ownership.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

// ---------------------------------------------------------------------------
// Canonical issue helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// validateOptionComparison
// ---------------------------------------------------------------------------

export async function validateOptionComparison(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];

  const compPath = path.join(root, "uiux", "30_comparison.md");
  const compContent = await readSafe(compPath);
  if (compContent) {
    const headingOptions = compContent.match(/^##\s+Option\b/gim);
    const tableOptions = compContent.match(/\bOption\s+[A-Z]\b/gim);
    const uniqueTableOptions = tableOptions
      ? new Set(tableOptions.map((m) => m.trim().toUpperCase())).size
      : 0;
    const optionCount = Math.max(headingOptions?.length ?? 0, uniqueTableOptions);
    if (optionCount < 2) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-COMPARISON-INSUFFICIENT",
          "30_comparison.md must contain at least 2 options for meaningful comparison.",
          "error",
          "uiux/30_comparison.md",
          "Add at least 2 '## Option' sections to uiux/30_comparison.md.",
        ),
      );
    }
  }

  if (compContent) {
    if (
      !/selected\s*:/i.test(compContent) &&
      !/chosen\s*:/i.test(compContent) &&
      !/\brecommendation\b/i.test(compContent)
    ) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-ANCHOR-MISSING",
          "30_comparison.md is missing a recommendation/selected anchor declaration.",
          "error",
          "uiux/30_comparison.md",
          "Add a 'Selected:' or '## Recommendation' section to uiux/30_comparison.md.",
        ),
      );
    }
  }

  return issues;
}
