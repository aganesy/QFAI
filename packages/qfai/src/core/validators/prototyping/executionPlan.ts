/**
 * executionPlan presence + field-level validator for full-harness prototyping.
 *
 * When mode=full-harness, prototyping.json MUST contain an executionPlan
 * object with all four required fields. v1.8.4 Phase 9 BREAKING: removed the
 * legacy `validateExecutionPlan` / `ExecutionPlanIssue` exports; callers MUST
 * use `validateExecutionPlanIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

const REQUIRED_FIELDS = [
  "targetIterations",
  "evaluationAxesSource",
  "delegationMap",
  "plannedAt",
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function detectMode(raw: unknown): string {
  if (!isRecord(raw)) return "other";
  if (typeof raw.mode === "string") return raw.mode;
  if (isRecord(raw.mode) && typeof raw.mode.effective === "string") {
    return raw.mode.effective;
  }
  return "other";
}

/**
 * Verifies that prototyping.json has an `executionPlan` object with the four
 * required fields populated when running in full-harness mode. Issues
 * `QFAI-PROT-310` for absence, invalid root, or missing/empty required field.
 */
export function validateExecutionPlanIssues(
  prototypingJson: unknown,
  prototypingJsonPath: string,
): Issue[] {
  const mode = detectMode(prototypingJson);
  if (mode !== "full-harness") {
    return [];
  }

  if (!isRecord(prototypingJson)) {
    return [
      buildIssue(
        "executionPlan is required in full-harness mode but prototyping record is invalid.",
        prototypingJsonPath,
      ),
    ];
  }
  if (!isRecord(prototypingJson.executionPlan)) {
    return [
      buildIssue(
        "executionPlan is required in full-harness mode but is absent or not an object in prototyping.json.",
        prototypingJsonPath,
      ),
    ];
  }

  // Field-level validation: each required field must be present and non-empty.
  // Reviewer comment from PR #201 (Copilot, MAJOR): the validator previously
  // only checked block presence even though the suggested_action enumerated
  // these fields. Now we enforce them.
  const issues: Issue[] = [];
  const executionPlan = prototypingJson.executionPlan;
  for (const field of REQUIRED_FIELDS) {
    const value = executionPlan[field];
    if (value === undefined || value === null || value === "") {
      issues.push(
        buildIssue(
          `executionPlan.${field} is required in full-harness mode but is missing or empty.`,
          prototypingJsonPath,
        ),
      );
    }
  }
  return issues;
}

function buildIssue(message: string, prototypingJsonPath: string): Issue {
  return issue(
    "QFAI-PROT-310",
    message,
    "error",
    prototypingJsonPath,
    "prototyping.executionPlan.presence",
    undefined,
    "canonical",
    "full-harness モードでは `prototyping.json.executionPlan` を記録してください " +
      "(targetIterations / evaluationAxesSource / delegationMap / plannedAt)。",
  );
}
