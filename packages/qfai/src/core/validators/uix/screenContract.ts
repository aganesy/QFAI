/**
 * UIX-VAL screen contract schema validator — spec-0034
 *
 * Validates multi-screen contract array: 10 required fields per screen,
 * unique screen_ids, and mandatory state coverage.
 *
 * BR-0034-0019, BR-0034-0020, BR-0034-0021, BR-0034-0022
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const REQUIRED_FIELDS = [
  "screen_id",
  "route",
  "purpose",
  "actor",
  "primary_tasks",
  "secondary_tasks",
  "required_states",
  "transitions",
  "observable_outcomes",
  "notes_for_verify",
  "notes_for_reviewer",
] as const;

const MANDATORY_STATES = ["default", "loading", "empty", "error"] as const;

const RELPATH = "uiux/40_screen_contracts.md";

function contractIssue(
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
    file: RELPATH,
    suggested_action: suggestedAction,
  };
}

/** Nested field names that use typed properties instead of flat fields. */
const NESTED_FIELD_NAMES = [
  "primary_tasks",
  "secondary_tasks",
  "required_states",
  "transitions",
  "observable_outcomes",
];

type ScreenBlock = {
  name: string;
  /** Flat scalar fields (screen_id, route, purpose, actor, notes_for_verify, notes_for_reviewer). */
  fields: Record<string, string>;
  /** Nested: primary_tasks list. */
  primaryTasks: string[];
  /** Nested: secondary_tasks list. */
  secondaryTasks: string[];
  /** Nested: required_states as key→description map. */
  requiredStates: Record<string, string>;
  /** Nested: transitions list. */
  transitions: string[];
  /** Nested: observable_outcomes list. */
  observableOutcomes: string[];
  /** Legacy flat nested fields that must now be rejected. */
  invalidInlineNestedFields: string[];
};

function newScreenBlock(name: string): ScreenBlock {
  return {
    name,
    fields: {},
    primaryTasks: [],
    secondaryTasks: [],
    requiredStates: {},
    transitions: [],
    observableOutcomes: [],
    invalidInlineNestedFields: [],
  };
}

/**
 * Section-aware screen block parser supporting only the canonical nested bullet format.
 *
 * Canonical format uses nested bullets:
 *   - primary_tasks:
 *     - task 1
 *   - required_states:
 *     - default: description
 *     - loading: description
 *
 */
function parseScreenBlocks(content: string): ScreenBlock[] {
  const blocks: ScreenBlock[] = [];
  const lines = content.split("\n");
  const headingRe = /^###\s+Screen:\s*(.+)/;
  const topFieldRe = /^\s*-\s+(\w[\w_]*):\s*(.*)/;
  const nestedChildRe = /^\s{2,}-\s+(.+)/;
  let current: ScreenBlock | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    const headingMatch = headingRe.exec(line);
    if (headingMatch?.[1]) {
      if (current) blocks.push(current);
      current = newScreenBlock(headingMatch[1].trim());
      i += 1;
      continue;
    }

    if (!current) {
      i += 1;
      continue;
    }

    const fieldMatch = topFieldRe.exec(line);
    if (fieldMatch?.[1]) {
      const key = fieldMatch[1].toLowerCase();
      const inlineValue = (fieldMatch[2] ?? "").trim();

      if (NESTED_FIELD_NAMES.includes(key) && inlineValue === "") {
        // Nested bullet list: collect indented children
        i += 1;
        while (i < lines.length) {
          const child = lines[i] ?? "";
          const childMatch = nestedChildRe.exec(child);
          if (childMatch?.[1]) {
            const childValue = childMatch[1].trim();
            assignNestedChild(current, key, childValue);
            i += 1;
          } else if (child.trim() === "") {
            i += 1;
          } else {
            break;
          }
        }
      } else if (NESTED_FIELD_NAMES.includes(key) && inlineValue !== "") {
        current.invalidInlineNestedFields.push(key);
        i += 1;
      } else {
        // Regular flat field
        if (inlineValue) {
          current.fields[key] = inlineValue;
        }
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  if (current) blocks.push(current);

  return blocks;
}

function assignNestedChild(block: ScreenBlock, key: string, value: string): void {
  switch (key) {
    case "primary_tasks":
      block.primaryTasks.push(value);
      break;
    case "secondary_tasks":
      block.secondaryTasks.push(value);
      break;
    case "required_states": {
      // Parse "state_key: description" or plain "state_key"
      const colonIdx = value.indexOf(":");
      if (colonIdx !== -1) {
        const stateKey = value.slice(0, colonIdx).trim().toLowerCase();
        const stateDesc = value.slice(colonIdx + 1).trim();
        block.requiredStates[stateKey] = stateDesc;
      } else {
        block.requiredStates[value.trim().toLowerCase()] = "";
      }
      break;
    }
    case "transitions":
      block.transitions.push(value);
      break;
    case "observable_outcomes":
      block.observableOutcomes.push(value);
      break;
  }
}

export async function validateScreenContractSchema(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const contractsPath = path.join(root, "uiux", "40_screen_contracts.md");
  const content = await readSafe(contractsPath);
  if (!content) return [];

  const screens = parseScreenBlocks(content);
  if (screens.length === 0) return [];

  const issues: Issue[] = [];

  // Check for duplicate screen_ids
  const seenIds = new Set<string>();
  for (const screen of screens) {
    const screenId = screen.fields["screen_id"];
    if (screenId) {
      if (seenIds.has(screenId)) {
        issues.push(
          contractIssue(
            "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID",
            `Duplicate screen_id '${screenId}' detected.`,
            "error",
            `Ensure each screen has a unique screen_id in ${RELPATH}.`,
          ),
        );
      }
      seenIds.add(screenId);
    }
  }

  // Validate each screen
  for (const screen of screens) {
    const screenId = screen.fields["screen_id"] ?? screen.name;

    if (screen.invalidInlineNestedFields.length > 0) {
      issues.push(
        contractIssue(
          "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT",
          `Screen '${screenId}' uses legacy flat nested fields: ${screen.invalidInlineNestedFields.join(", ")}. Use nested canonical bullets only.`,
          "error",
          `Rewrite ${screen.invalidInlineNestedFields.join(", ")} as nested canonical bullets in ${RELPATH}.`,
        ),
      );
    }

    // Check required fields (dispatch to typed properties for nested fields)
    const missing = REQUIRED_FIELDS.filter((f) => {
      if (f === "primary_tasks") return screen.primaryTasks.length === 0;
      if (f === "secondary_tasks") return screen.secondaryTasks.length === 0;
      if (f === "required_states") return Object.keys(screen.requiredStates).length === 0;
      if (f === "transitions") return screen.transitions.length === 0;
      if (f === "observable_outcomes") return screen.observableOutcomes.length === 0;
      return !screen.fields[f];
    });
    if (missing.length > 0) {
      issues.push(
        contractIssue(
          "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
          `Screen '${screenId}' is missing fields: ${missing.join(", ")}`,
          "error",
          `Add the missing fields to screen '${screenId}' in ${RELPATH}.`,
        ),
      );
    }

    // Check state coverage
    const stateKeys = Object.keys(screen.requiredStates).map((s) => s.toLowerCase());
    if (stateKeys.length > 0) {
      const missingStates = MANDATORY_STATES.filter((s) => !stateKeys.includes(s));
      if (missingStates.length > 0) {
        issues.push(
          contractIssue(
            "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE",
            `Screen '${screenId}' required_states missing mandatory states: ${missingStates.join(", ")}`,
            "error",
            `Add missing states (${missingStates.join(", ")}) to required_states for screen '${screenId}'.`,
          ),
        );
      }
    }
  }

  return issues;
}
