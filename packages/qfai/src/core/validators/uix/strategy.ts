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
  "decision",
  "why_this_strategy",
  "expected_strengths",
  "known_risks",
  "fit_for_this_product",
] as const;
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|none|example|placeholder)$/i;

/** Canonical surface enum values */
const VALID_SURFACE_VALUES = new Set(["web", "mobile", "desktop", "cli", "mixed", "non-ui"]);

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
    file: "uiux/10_implementation_strategy.md",
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

  const strategyPath = path.join(root, "uiux", "10_implementation_strategy.md");
  const legacyStrategyPath = path.join(root, "uiux", "10_strategy.md");
  const [content, legacyContent] = await Promise.all([
    readSafe(strategyPath),
    readSafe(legacyStrategyPath),
  ]);
  if (!content && !legacyContent) return [];
  if (!content && legacyContent) {
    return [
      strategyIssue(
        "UIX-VAL-STRATEGY-LEGACY-FILENAME",
        "Legacy strategy filename 'uiux/10_strategy.md' is no longer accepted. Use uiux/10_implementation_strategy.md.",
        "error",
        "Rename uiux/10_strategy.md to uiux/10_implementation_strategy.md and keep only the canonical filename.",
      ),
    ];
  }
  if (content && legacyContent) {
    return [
      strategyIssue(
        "UIX-VAL-STRATEGY-DUPLICATE-FILENAME",
        "Both uiux/10_implementation_strategy.md and legacy uiux/10_strategy.md exist. Keep only the canonical filename.",
        "error",
        "Delete uiux/10_strategy.md and retain uiux/10_implementation_strategy.md only.",
      ),
    ];
  }
  if (!content) return [];

  const parsed = parseStrategyFields(content);
  const issues: Issue[] = [];

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
          `Add the '${field}' field to uiux/10_implementation_strategy.md.`,
        ),
      );
      continue;
    }
    if (
      typeof value === "string" &&
      (PLACEHOLDER_RE.test(value.trim()) || value.trim().length === 0)
    ) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-PLACEHOLDER",
          `Strategy field '${field}' contains placeholder content.`,
          "error",
          `Replace '${field}' in uiux/10_implementation_strategy.md with project-specific content.`,
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
          "error",
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
          "error",
          `Use one of the canonical decision values: ${[...VALID_DECISION_VALUES].join(", ")}`,
        ),
      );
    }
  }

  return issues;
}
