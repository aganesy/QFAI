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
  "screen_id", "route", "purpose", "actor", "primary_tasks",
  "required_states", "transitions", "observable_outcomes",
  "notes_for_verify", "notes_for_reviewer",
] as const;

const MANDATORY_STATES = ["default", "loading", "empty", "error"] as const;

const RELPATH = "uiux/40_contracts.md";

function contractIssue(
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
    file: RELPATH,
    suggested_action: suggestedAction,
  };
}

type ScreenBlock = {
  name: string;
  fields: Record<string, string>;
};

function parseScreenBlocks(content: string): ScreenBlock[] {
  const blocks: ScreenBlock[] = [];
  const lines = content.split("\n");
  let current: ScreenBlock | null = null;

  for (const line of lines) {
    const headingMatch = /^###\s+Screen:\s*(.+)/.exec(line);
    if (headingMatch?.[1]) {
      if (current) blocks.push(current);
      current = { name: headingMatch[1].trim(), fields: {} };
      continue;
    }
    if (current) {
      const fieldMatch = /^\s*-\s+(\w[\w_]*):\s*(.+)/.exec(line);
      if (fieldMatch?.[1] && fieldMatch[2]) {
        current.fields[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim();
      }
    }
  }
  if (current) blocks.push(current);

  return blocks;
}

export async function validateScreenContractSchema(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const contractsPath = path.join(root, "uiux", "40_contracts.md");
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

    // Check required fields
    const missing = REQUIRED_FIELDS.filter((f) => !screen.fields[f]);
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
    const states = screen.fields["required_states"];
    if (states) {
      const stateList = states.split(",").map((s) => s.trim().toLowerCase());
      const missingStates = MANDATORY_STATES.filter((s) => !stateList.includes(s));
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
