/**
 * UIX-VAL scoring-ready schema validator — spec-0034
 *
 * Validates that each evaluation axis has all 16 mandatory fields
 * and that aggregate scoring rules are present.
 *
 * BR-0034-0012, BR-0034-0013, BR-0034-0014
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const REQUIRED_AXIS_FIELDS = [
  "axis_id",
  "axis_name",
  "layer",
  "definition",
  "rationale",
  "scoring_rubric",
  "weight",
  "min_score",
  "max_score",
  "pass_threshold",
  "evidence_type",
  "evidence_source",
  "review_prompt",
  "calibration_anchor",
  "dependencies",
  "review_questions",
] as const;

const AGGREGATE_REQUIRED = ["thresholds", "floors", "plateau", "missing_score_policy"] as const;

function scoringIssue(
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

/**
 * Parse bullet-style fields from a section block.
 */
function parseFields(block: string): Set<string> {
  const fields = new Set<string>();
  for (const line of block.split("\n")) {
    const match = /^\s*-\s+(\w[\w_]*):\s*.+/.exec(line);
    if (match?.[1]) {
      fields.add(match[1].toLowerCase());
    }
  }
  return fields;
}

export async function validateScoringReady(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];

  // Read eval axes
  const axesPath = path.join(root, "uiux", "20_eval_axes.md");
  const axesContent = await readSafe(axesPath);
  const relPath = "uiux/20_eval_axes.md";

  if (axesContent) {
    // Split by "## Axis:" sections
    const blocks = axesContent.split(/(?=^##\s+Axis:)/m);
    for (const block of blocks) {
      const nameMatch = /^##\s+Axis:\s*(\S+)/m.exec(block);
      if (!nameMatch?.[1]) continue;

      const axisName = nameMatch[1];
      const fields = parseFields(block);
      const missing = REQUIRED_AXIS_FIELDS.filter((f) => !fields.has(f));

      if (missing.length > 0) {
        issues.push(
          scoringIssue(
            "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE",
            `Axis '${axisName}' is missing scoring-ready fields: ${missing.join(", ")}`,
            "error",
            relPath,
            `Add the missing fields to axis '${axisName}' in ${relPath}.`,
          ),
        );
      }
    }
  }

  // Check aggregate scoring rules
  const aggregatePath = path.join(root, "uiux", "21_aggregate_scoring.md");
  const aggregateContent = await readSafe(aggregatePath);

  if (aggregateContent) {
    const fields = parseFields(aggregateContent);
    const missing = AGGREGATE_REQUIRED.filter((f) => !fields.has(f));

    if (missing.length > 0) {
      issues.push(
        scoringIssue(
          "UIX-VAL-AGGREGATE-SCORING-INCOMPLETE",
          `Aggregate scoring rules missing fields: ${missing.join(", ")}`,
          "error",
          "uiux/21_aggregate_scoring.md",
          `Add the missing fields to uiux/21_aggregate_scoring.md.`,
        ),
      );
    }
  }

  return issues;
}
