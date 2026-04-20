import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import {
  CANONICAL_PROTOTYPING_SURFACES,
  isCanonicalPrototypingSurface,
  requiresVisualBrowserEvidenceSurface,
} from "../../domain/surface.js";
import {
  CANONICAL_STRATEGY_DECISIONS,
  isCanonicalStrategyDecision,
} from "../../domain/strategyDecision.js";
import type { CanonicalStrategyDecision } from "../../domain/strategyDecision.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { readSafe } from "../utils.js";
import type { StrategySchema } from "./types.js";

type ParsedStrategyFields = StrategySchema &
  Record<string, unknown> & {
    candidate_options?: string | string[];
    chosen_option?: string;
    decision?: string;
    notes_for_reviewer?: string | string[];
    rationale?: string | string[];
    selection_required?: string;
    surface?: string;
    verification_expectations?: string | string[];
  };

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

function parseStrategyFields(content: string): ParsedStrategyFields {
  const result: Record<string, string | string[]> = { candidateOptions: [] };
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

  const normalizedSurface =
    typeof result.surface === "string" ? result.surface.trim().toLowerCase() : undefined;
  const surface: StrategySchema["surface"] =
    normalizedSurface && isCanonicalPrototypingSurface(normalizedSurface)
      ? normalizedSurface
      : undefined;
  const selectionRequired =
    result.selection_required === "true"
      ? true
      : result.selection_required === "false"
        ? false
        : undefined;
  const normalizedDecision =
    typeof result.decision === "string" ? result.decision.trim() : undefined;
  const decision: StrategySchema["decision"] =
    normalizedDecision && isCanonicalStrategyDecision(normalizedDecision)
      ? normalizedDecision
      : undefined;
  const candidateOptionsRaw = Array.isArray(result.candidate_options)
    ? result.candidate_options
    : typeof result.candidate_options === "string" && result.candidate_options.trim().length > 0
      ? [result.candidate_options.trim()]
      : [];
  const candidateOptions = candidateOptionsRaw.filter((value): value is CanonicalStrategyDecision =>
    isCanonicalStrategyDecision(value),
  );
  const normalizedChosenOption =
    typeof result.chosen_option === "string" ? result.chosen_option.trim() : undefined;
  const chosenOption: StrategySchema["chosenOption"] =
    normalizedChosenOption && isCanonicalStrategyDecision(normalizedChosenOption)
      ? normalizedChosenOption
      : undefined;

  return {
    ...result,
    ...(surface ? { surface } : {}),
    ...(selectionRequired !== undefined ? { selectionRequired } : {}),
    ...(decision ? { decision } : {}),
    candidateOptions,
    ...(chosenOption ? { chosenOption } : {}),
  };
}

function isMeaningfulString(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every(
        (entry) =>
          typeof entry === "string" &&
          entry.trim().length > 0 &&
          !PLACEHOLDER_RE.test(entry.trim()),
      )
    );
  }
  if (typeof value !== "string") {
    return false;
  }
  return value.trim().length > 0 && !PLACEHOLDER_RE.test(value.trim());
}

export async function validateStrategyStrong(root: string, _config: QfaiConfig): Promise<Issue[]> {
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
  if (surfaceVal.length > 0 && !isCanonicalPrototypingSurface(surfaceVal)) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-INVALID-SURFACE",
        `Strategy surface value '${surfaceLabel}' is invalid. Valid values: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}`,
        "error",
        `Set surface to one of: ${CANONICAL_PROTOTYPING_SURFACES.join(", ")}`,
      ),
    );
  }

  if (parsed.selectionRequired === undefined) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-SELECTION-BOOLEAN",
        "selection_required must be true or false.",
        "error",
        "Set selection_required to true or false.",
      ),
    );
  }

  const candidateOptionsRaw = Array.isArray(parsed.candidate_options)
    ? parsed.candidate_options
    : typeof parsed.candidate_options === "string" && parsed.candidate_options.trim().length > 0
      ? [parsed.candidate_options.trim()]
      : [];
  const candidateOptions = parsed.candidateOptions;
  const chosenOptionRaw =
    typeof parsed.chosen_option === "string" ? parsed.chosen_option.trim() : "";
  const chosenOption = parsed.chosenOption;
  const decision = typeof parsed.decision === "string" ? parsed.decision.trim() : "";
  const invalidCandidateOptions = candidateOptionsRaw.filter(
    (value) => !isCanonicalStrategyDecision(value),
  );

  if (typeof parsed.decision === "string" && !isCanonicalStrategyDecision(decision)) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-INVALID-DECISION",
        `decision '${decision}' is invalid. Valid values: ${CANONICAL_STRATEGY_DECISIONS.join(", ")}`,
        "error",
        `Set decision to one of: ${CANONICAL_STRATEGY_DECISIONS.join(", ")}`,
      ),
    );
  }

  if (invalidCandidateOptions.length > 0) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-INVALID-CANDIDATE-OPTION",
        `candidate_options contains invalid values: ${invalidCandidateOptions.join(", ")}`,
        "error",
        `candidate_options must use only: ${CANONICAL_STRATEGY_DECISIONS.join(", ")}`,
      ),
    );
  }

  if (typeof parsed.chosen_option === "string" && !isCanonicalStrategyDecision(chosenOptionRaw)) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-INVALID-CHOSEN-OPTION",
        `chosen_option '${chosenOptionRaw}' is invalid. Valid values: ${CANONICAL_STRATEGY_DECISIONS.join(", ")}`,
        "error",
        `Set chosen_option to one of: ${CANONICAL_STRATEGY_DECISIONS.join(", ")}`,
      ),
    );
  }

  if (new Set(candidateOptions).size !== candidateOptions.length) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-DUPLICATE-CANDIDATE-OPTION",
        "candidate_options must not contain duplicates.",
        "error",
        "Remove duplicate values from candidate_options.",
      ),
    );
  }

  if (parsed.selectionRequired === true && candidateOptions.length < 2) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-CANDIDATE-OPTIONS",
        "selection_required=true requires candidate_options to contain at least two canonical options.",
        "error",
        "List at least two canonical candidate_options.",
      ),
    );
  }

  if (parsed.selectionRequired === true && decision === "none") {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-SELECTION-REQUIRES-DECISION",
        "selection_required=true does not allow decision=none.",
        "error",
        "Use a canonical strategy decision other than none.",
      ),
    );
  }

  if (parsed.selectionRequired === true && chosenOption === "none") {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-SELECTION-REQUIRES-CHOSEN",
        "selection_required=true does not allow chosen_option=none.",
        "error",
        "Use a canonical chosen_option other than none.",
      ),
    );
  }

  if (
    parsed.selectionRequired === true &&
    chosenOption !== undefined &&
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

  if (parsed.selectionRequired === false && decision !== "none") {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-NONE-DECISION-REQUIRED",
        "selection_required=false requires decision=none.",
        "error",
        "Set decision to none when selection_required=false.",
      ),
    );
  }

  if (parsed.selectionRequired === false && chosenOption !== "none") {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-NONE-CHOSEN-REQUIRED",
        "selection_required=false requires chosen_option=none.",
        "error",
        "Set chosen_option to none when selection_required=false.",
      ),
    );
  }

  if (
    parsed.selectionRequired === false &&
    candidateOptions.length > 0 &&
    !(candidateOptions.length === 1 && candidateOptions[0] === "none")
  ) {
    issues.push(
      strategyIssue(
        "UIX-VAL-STRATEGY-NONE-CANDIDATES-REQUIRED",
        "selection_required=false allows candidate_options to be empty or ['none'] only.",
        "error",
        "Clear candidate_options or use only none.",
      ),
    );
  }

  const isVisualBrowserSurface =
    isCanonicalPrototypingSurface(surfaceVal) && requiresVisualBrowserEvidenceSurface(surfaceVal);
  const isNonUiSurface = surfaceVal === "non-ui";
  if (
    isNonUiSurface &&
    !isVisualBrowserSurface &&
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
        `surface='${surfaceVal}' but the strategy text is heavily visual/browser-oriented.`,
        "warning",
        "Reframe the strategy around non-UI behavior and remove visual/browser-only expectations.",
      ),
    );
  }

  return issues;
}
