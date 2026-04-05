import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import {
  CANONICAL_SURFACES,
  isCanonicalSurface,
  isUiBearingSurface,
} from "../../domain/surface.js";
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

const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|na|none|example|placeholder)$/i;
const UI_CENTRIC_TOKENS = [
  "screen",
  "layout",
  "visual",
  "navigation",
  "responsive",
  "component",
  "interaction",
  "flow",
  "dashboard",
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
    category: "canonical",
    message,
    file: "uiux/10_implementation_strategy.md",
    suggested_action: suggestedAction,
  };
}

function parseStrategyFields(content: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const lines = content.split("\n");
  const topFieldRe = /^\s*-\s+(\w[\w_]*):\s*(.*)/;
  const nestedChildRe = /^\s{2,}-\s+(.+)/;

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const match = topFieldRe.exec(line);
    if (!match?.[1]) {
      index += 1;
      continue;
    }

    const key = match[1].toLowerCase();
    const inlineValue = (match[2] ?? "").trim();
    if (inlineValue.length > 0) {
      result[key] = inlineValue;
      index += 1;
      continue;
    }

    const children: string[] = [];
    index += 1;
    while (index < lines.length) {
      const child = lines[index] ?? "";
      const childMatch = nestedChildRe.exec(child);
      if (childMatch?.[1]) {
        children.push(childMatch[1].trim());
        index += 1;
        continue;
      }
      if (child.trim() === "") {
        index += 1;
        continue;
      }
      break;
    }
    result[key] = children;
  }

  return result;
}

function isMeaningfulString(value: string | string[] | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every((entry) => entry.trim().length > 0 && !PLACEHOLDER_RE.test(entry.trim()))
    );
  }
  return value.trim().length > 0 && !PLACEHOLDER_RE.test(value.trim());
}

export async function validateStrategyStrong(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) {
    return [];
  }

  const strategyPath = path.join(root, "uiux", "10_implementation_strategy.md");
  const legacyStrategyPath = path.join(root, "uiux", "10_strategy.md");
  const [content, legacyContent] = await Promise.all([
    readSafe(strategyPath),
    readSafe(legacyStrategyPath),
  ]);
  if (!content && !legacyContent) {
    return [];
  }
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
  if (!content) {
    return [];
  }

  const parsed = parseStrategyFields(content);
  const issues: Issue[] = [];

  for (const field of STRONG_FIELDS) {
    if (!isMeaningfulString(parsed[field])) {
      issues.push(
        strategyIssue(
          "UIX-VAL-STRATEGY-INCOMPLETE",
          `Strategy field '${field}' is missing, empty, or placeholder-like.`,
          "error",
          `Populate '${field}' with canonical schema content in uiux/10_implementation_strategy.md.`,
        ),
      );
    }
  }

  const surfaceVal = typeof parsed.surface === "string" ? parsed.surface.trim().toLowerCase() : "";
  const surfaceLabel = typeof parsed.surface === "string" ? parsed.surface : "";
  if (surfaceVal.length > 0 && !isCanonicalSurface(surfaceVal)) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-INVALID-SURFACE",
        `Strategy surface value '${surfaceLabel}' is invalid. Valid values: ${CANONICAL_SURFACES.join(", ")}`,
        "error",
        `Set surface to one of: ${CANONICAL_SURFACES.join(", ")}`,
      ),
    );
  }

  if (
    typeof parsed.selection_required !== "string" ||
    (parsed.selection_required !== "true" && parsed.selection_required !== "false")
  ) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-SELECTION-BOOLEAN",
        "selection_required must be true or false.",
        "error",
        "Set selection_required to true or false.",
      ),
    );
  }

  const candidateOptions = Array.isArray(parsed.candidate_options)
    ? parsed.candidate_options
    : typeof parsed.candidate_options === "string" && parsed.candidate_options.trim().length > 0
      ? [parsed.candidate_options.trim()]
      : [];
  const chosenOption = typeof parsed.chosen_option === "string" ? parsed.chosen_option.trim() : "";
  const decision = typeof parsed.decision === "string" ? parsed.decision.trim() : "";

  if (candidateOptions.length < 1) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-CANDIDATE-OPTIONS",
        "candidate_options must contain at least one option.",
        "error",
        "Add at least one candidate option.",
      ),
    );
  }

  if (
    chosenOption.length > 0 &&
    candidateOptions.length > 0 &&
    !candidateOptions.includes(chosenOption)
  ) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-CHOSEN-OPTION",
        "chosen_option must be included in candidate_options.",
        "error",
        "Align chosen_option with one of candidate_options.",
      ),
    );
  }

  if (parsed.selection_required === "false" && candidateOptions.length > 1) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-SELECTION-WARN",
        "selection_required=false while multiple candidate_options are listed.",
        "warning",
        "Either narrow candidate_options to one option or set selection_required=true.",
      ),
    );
  }

  if (decision.length > 0 && chosenOption.length > 0 && decision !== chosenOption) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-DECISION-MISMATCH",
        "decision and chosen_option use different vocabulary.",
        "warning",
        "Use the same term in decision and chosen_option unless the distinction is intentional.",
      ),
    );
  }

  if (
    isCanonicalSurface(surfaceVal) &&
    !isUiBearingSurface(surfaceVal) &&
    [parsed.decision, parsed.rationale, parsed.verification_expectations, parsed.notes_for_reviewer]
      .map((value) => (Array.isArray(value) ? value.join(" ") : (value ?? "")))
      .join(" ")
      .toLowerCase()
      .split(/\W+/)
      .some((token) => UI_CENTRIC_TOKENS.includes(token as (typeof UI_CENTRIC_TOKENS)[number]))
  ) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-NONUI-WARN",
        `surface='${surfaceVal}' but the strategy text is heavily UI-centric.`,
        "warning",
        "Reframe the strategy around CLI/non-UI behavior when the surface is cli or non-ui.",
      ),
    );
  }

  return issues;
}
