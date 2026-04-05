/**
 * Canonical UIX comparison validator — v1.7.14
 *
 * Validates option comparison in 30_option_comparison.md and
 * selected anchor in 31_selected_anchor_screen.md.
 *
 * The old 30_comparison.md with embedded "Selected Direction" is no longer
 * the canonical format. Comparison and selection are now split across two files.
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

  // Validate 30_option_comparison.md
  const compPath = path.join(root, "uiux", "30_option_comparison.md");
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
          "30_option_comparison.md must contain at least 2 options for meaningful comparison.",
          "error",
          "uiux/30_option_comparison.md",
          "Add at least 2 '## Option' sections or table entries to uiux/30_option_comparison.md.",
        ),
      );
    }
  }

  // Validate 31_selected_anchor_screen.md
  const anchorPath = path.join(root, "uiux", "31_selected_anchor_screen.md");
  const anchorContent = await readSafe(anchorPath);
  if (anchorContent) {
    // Must have selected_option
    if (!/selected_option\s*:/i.test(anchorContent)) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-ANCHOR-SELECTED-OPTION-MISSING",
          "31_selected_anchor_screen.md is missing the selected_option field.",
          "error",
          "uiux/31_selected_anchor_screen.md",
          "Add a 'selected_option' field identifying the chosen option from 30_option_comparison.md.",
        ),
      );
    }

    // Must have why_selected or rationale
    if (!/why_selected\s*:/i.test(anchorContent)) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-ANCHOR-RATIONALE-MISSING",
          "31_selected_anchor_screen.md is missing the why_selected field.",
          "error",
          "uiux/31_selected_anchor_screen.md",
          "Add a 'why_selected' field with the rationale for the selection.",
        ),
      );
    }

    // Must have rejected/deferred options section
    if (
      !/rejected_or_deferred_options/i.test(anchorContent) &&
      !/disposition\s*:/i.test(anchorContent)
    ) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-ANCHOR-REJECTED-MISSING",
          "31_selected_anchor_screen.md does not document rejected or deferred options.",
          "warning",
          "uiux/31_selected_anchor_screen.md",
          "Add rejected/deferred option sections with disposition and reason.",
        ),
      );
    }
  }

  return issues;
}
