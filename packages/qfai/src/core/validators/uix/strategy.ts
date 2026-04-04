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

/** Canonical surface enum values */
const VALID_SURFACE_VALUES = new Set(["web", "mobile", "desktop", "cli", "mixed"]);

/** Legacy surface values that should be migrated */
const LEGACY_SURFACE_VALUES = new Set(["web-ui", "mobile-ui", "desktop-ui"]);

/** Canonical decision enum values */
const VALID_DECISION_VALUES = new Set([
  "template",
  "component-library",
  "design-system",
  "native-pattern",
  "bespoke",
  "none",
]);

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

/**
 * Section-aware parser that handles both flat `- key: value` and nested bullet lists.
 *
 * Canonical format for `candidate_options` uses nested bullets:
 *   - candidate_options:
 *     - Option A description
 *     - Option B description
 *
 * Legacy inline CSV format is accepted for compatibility:
 *   - candidate_options: Option A, Option B
 */
function parseStrategyFields(content: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = content.split("\n");
  const topFieldRe = /^\s*-\s+(\w[\w_]*):\s*(.*)/;
  const nestedChildRe = /^\s{2,}-\s+(.+)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const match = topFieldRe.exec(line);
    if (match?.[1]) {
      const key = match[1].toLowerCase();
      const inlineValue = (match[2] ?? "").trim();

      if (inlineValue === "") {
        // Nested bullet list: collect indented children
        const children: string[] = [];
        i += 1;
        while (i < lines.length) {
          const child = lines[i] ?? "";
          const childMatch = nestedChildRe.exec(child);
          if (childMatch?.[1]) {
            children.push(childMatch[1].trim());
            i += 1;
          } else if (child.trim() === "") {
            // Skip blank lines within nested block
            i += 1;
          } else {
            break;
          }
        }
        result[key] = children;
      } else {
        result[key] = inlineValue;
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return result;
}

export async function validateStrategyStrong(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const strategyPath = path.join(root, "uiux", "10_strategy.md");
  const content = await readSafe(strategyPath);
  if (!content) return [];

  const parsed = parseStrategyFields(content);
  const issues: Issue[] = [];

  // Detect format: strong schema uses "surface" (not "surface_type")
  // Fields unique to strong schema (not shared with weak format)
  const strongOnlyFields = [
    "surface",
    "selection_required",
    "decision",
    "candidate_options",
    "chosen_option",
  ];
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
    const value = parsed[field];
    const isEmpty =
      value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
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

  // Validate surface enum
  const surfaceVal = parsed["surface"];
  if (typeof surfaceVal === "string" && surfaceVal.trim()) {
    const normalizedSurface = surfaceVal.trim().toLowerCase();
    if (LEGACY_SURFACE_VALUES.has(normalizedSurface)) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-LEGACY-SURFACE",
          `Strategy surface value '${surfaceVal}' uses legacy naming. Use canonical values: ${[...VALID_SURFACE_VALUES].join(", ")}`,
          "warning",
          `Update surface from '${surfaceVal}' to its canonical equivalent (e.g., web-ui → web).`,
        ),
      );
    } else if (!VALID_SURFACE_VALUES.has(normalizedSurface)) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-INVALID-SURFACE",
          `Strategy surface value '${surfaceVal}' is not a valid canonical enum. Valid values: ${[...VALID_SURFACE_VALUES].join(", ")}`,
          "error",
          `Set surface to one of: ${[...VALID_SURFACE_VALUES].join(", ")}`,
        ),
      );
    }
  }

  // Validate decision enum (canonical values preferred, freeform accepted with warning)
  const decisionVal = parsed["decision"];
  if (typeof decisionVal === "string" && decisionVal.trim()) {
    const normalizedDecision = decisionVal.trim().toLowerCase();
    if (!VALID_DECISION_VALUES.has(normalizedDecision)) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-NONCANONICAL-DECISION",
          `Strategy decision value '${decisionVal}' is not a canonical enum. Canonical values: ${[...VALID_DECISION_VALUES].join(", ")}`,
          "warning",
          `Consider using a canonical decision value: ${[...VALID_DECISION_VALUES].join(", ")}`,
        ),
      );
    }
  }

  // decision=none requires selection_required=false
  if (
    typeof decisionVal === "string" &&
    decisionVal.trim().toLowerCase() === "none" &&
    typeof parsed["selection_required"] === "string" &&
    parsed["selection_required"].trim().toLowerCase() === "true"
  ) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-DECISION-NONE-CONFLICT",
        "Strategy decision is 'none' but selection_required is true. These are contradictory.",
        "error",
        "Set selection_required to false when decision is 'none', or choose a concrete decision.",
      ),
    );
  }

  // selection_required constraint: if true, candidate_options must have >= 2 entries
  const selectionRequired = parsed["selection_required"];
  if (typeof selectionRequired === "string" && selectionRequired.toLowerCase() === "true") {
    const candidates = parsed["candidate_options"];
    let count = 0;
    if (Array.isArray(candidates)) {
      count = candidates.length;
    } else if (typeof candidates === "string") {
      count = candidates.split(",").filter((c) => c.trim()).length;
    }
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

  return issues;
}
