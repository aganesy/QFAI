/**
 * UIX-VAL scoring-ready schema validator - spec-0034
 *
 * Validates that each evaluation axis in the split 3-layer family files
 * has all mandatory fields per the canonical design spec and that aggregate
 * scoring rules are present in 23_design_eval_aggregate.md.
 *
 * Target files (canonical split family):
 *   - 20_design_eval_invariant.md
 *   - 21_design_eval_trend_derived.md
 *   - 22_design_eval_product_specific.md
 *   - 23_design_eval_aggregate.md
 *   - 24_design_eval_dynamic_overrides.md (optional override policy)
 *
 * BR-0034-0012, BR-0034-0013, BR-0034-0014
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

/**
 * Canonical axis fields - matches the design spec exactly.
 * Includes flat bullet fields, nested object fields (score_anchors.*),
 * and list fields.
 */
const REQUIRED_AXIS_FIELDS = [
  "axis_id",
  "axis_name",
  "layer",
  "origin",
  "intent",
  "why_it_matters",
  "score_scale",
  "score_anchors",
  "positive_signals",
  "negative_signals",
  "anti_patterns",
  "evidence_required",
  "weight",
  "minimum_floor",
  "source_refs",
  "goal_refs",
  "review_questions",
] as const;

/** Sub-fields required within score_anchors */
const SCORE_ANCHOR_SUBFIELDS = ["low", "mid", "high"] as const;

/**
 * Canonical aggregate scoring fields - matches the design spec exactly.
 */
const AGGREGATE_REQUIRED = [
  "total_score_formula",
  "layer_weights",
  "accept_threshold",
  "refine_band",
  "pivot_band",
  "max_iterations",
  "plateau_rule",
  "missing_score_policy",
  "disagreement_rule",
] as const;

/** Canonical split layer files (axis definitions). */
const LAYER_FILES = [
  "20_design_eval_invariant.md",
  "21_design_eval_trend_derived.md",
  "22_design_eval_product_specific.md",
] as const;

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
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

/**
 * Parse bullet-style fields from a section block.
 * Handles both flat `- key: value` and nested `- key:` followed by indented children.
 */
function parseFields(block: string): Set<string> {
  const fields = new Set<string>();
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = /^\s*-\s+(\w[\w_.]*):\s*(.*)/.exec(line);
    if (match?.[1]) {
      const key = match[1].toLowerCase();
      fields.add(key);

      // Check for nested children (for score_anchors subfields)
      if (key === "score_anchors" && !(match[2] ?? "").trim()) {
        // Parse indented children
        let j = i + 1;
        while (j < lines.length) {
          const child = lines[j] ?? "";
          const childMatch = /^\s{2,}-\s+(\w+)\s*:/.exec(child);
          if (childMatch?.[1]) {
            fields.add(`score_anchors.${childMatch[1].toLowerCase()}`);
            j++;
          } else if (child.trim() === "") {
            j++;
          } else {
            break;
          }
        }
      }
    }
  }
  return fields;
}

export async function validateScoringReady(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const issues: Issue[] = [];

  // Validate each layer file for scoring-ready axis fields
  for (const layerFile of LAYER_FILES) {
    const filePath = path.join(root, "uiux", layerFile);
    const content = await readSafe(filePath);
    if (!content) continue;

    const relPath = `uiux/${layerFile}`;

    // Split by "## Axis:" sections
    const blocks = content.split(/(?=^##\s+Axis:)/m);
    for (const block of blocks) {
      const nameMatch = /^##\s+Axis:\s*(\S+)/m.exec(block);
      if (!nameMatch?.[1]) continue;

      const axisName = nameMatch[1];
      const fields = parseFields(block);

      // Check top-level required fields
      const missingTopLevel = REQUIRED_AXIS_FIELDS.filter((f) => !fields.has(f));

      // For score_anchors, also check sub-fields
      const missingSubFields: string[] = [];
      if (fields.has("score_anchors")) {
        for (const sub of SCORE_ANCHOR_SUBFIELDS) {
          if (!fields.has(`score_anchors.${sub}`)) {
            missingSubFields.push(`score_anchors.${sub}`);
          }
        }
      }

      const allMissing = [...missingTopLevel, ...missingSubFields];
      if (allMissing.length > 0) {
        issues.push(
          scoringIssue(
            "UIX-VAL-DYNAMIC-AXIS-INCOMPLETE",
            `Axis '${axisName}' is missing scoring-ready fields: ${allMissing.join(", ")}`,
            "error",
            relPath,
            `Add the missing fields to axis '${axisName}' in ${relPath}.`,
          ),
        );
      }
    }
  }

  // Check aggregate scoring rules in canonical file
  const aggregatePath = path.join(root, "uiux", "23_design_eval_aggregate.md");
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
          "uiux/23_design_eval_aggregate.md",
          `Add the missing fields to uiux/23_design_eval_aggregate.md.`,
        ),
      );
    }
  }

  return issues;
}
