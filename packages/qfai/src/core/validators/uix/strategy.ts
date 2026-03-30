/**
 * UIX-VAL strategy strong schema validator — spec-0034
 *
 * Validates the strategy artifact against the 8-field strong schema
 * and detects weak (legacy) format.
 *
 * BR-0034-0015, BR-0034-0016, BR-0034-0017, BR-0034-0018
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const STRONG_FIELDS = [
  "surface",
  "selection_required",
  "decision",
  "candidate_options",
  "chosen_option",
  "rationale",
  "verification_expectations",
  "notes_for_reviewer",
] as const;

function strategyIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file: "uiux/10_strategy.md",
    suggested_action: suggestedAction,
  };
}

function parseFields(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = /^\s*-\s+(\w[\w_]*):\s*(.+)/.exec(line);
    if (match?.[1] && match[2]) {
      result[match[1].toLowerCase()] = match[2].trim();
    }
  }
  return result;
}

export async function validateStrategyStrong(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const strategyPath = path.join(root, "uiux", "10_strategy.md");
  const content = await readSafe(strategyPath);
  if (!content) return [];

  const parsed = parseFields(content);
  const issues: Issue[] = [];

  // Detect format: strong schema uses "surface" (not "surface_type")
  // Fields unique to strong schema (not shared with weak format)
  const strongOnlyFields = ["surface", "selection_required", "decision", "candidate_options", "chosen_option"];
  const hasStrongOnlyFields = strongOnlyFields.some((f) => parsed[f] !== undefined);
  const hasWeakOnlyFields = parsed["surface_type"] !== undefined && !hasStrongOnlyFields;

  if (hasWeakOnlyFields) {
    // Weak format detected
    return [
      strategyIssue(
        "UIX-VAL-STRATEGY-WEAK-LEGACY",
        "Strategy uses weak format (surface_type/approach/rationale only). Upgrade to 8-field strong schema.",
        "warning",
        "Upgrade 10_strategy.md to the 8-field strong schema: surface, selection_required, decision, candidate_options, chosen_option, rationale, verification_expectations, notes_for_reviewer.",
      ),
    ];
  }

  // Validate strong schema fields
  for (const field of STRONG_FIELDS) {
    if (!parsed[field]) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-INCOMPLETE",
          `Strategy field '${field}' is missing or empty.`,
          "error",
          `Add the '${field}' field to uiux/10_strategy.md.`,
        ),
      );
    }
  }

  // selection_required constraint: if true, candidate_options must have >= 2 entries
  if (parsed["selection_required"]?.toLowerCase() === "true") {
    const candidates = parsed["candidate_options"];
    if (candidates) {
      const count = candidates.split(",").filter((c) => c.trim()).length;
      if (count < 2) {
        issues.push(
          strategyIssue(
            "UIX-VAL-STRATEGY-SELECTION-CONSTRAINT",
            "selection_required is true but candidate_options has fewer than 2 entries.",
            "error",
            "Add at least 2 candidate options when selection_required is true.",
          ),
        );
      }
    }
  }

  return issues;
}
