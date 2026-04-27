/**
 * executionPlan presence validator for full-harness prototyping.
 *
 * When mode=full-harness, prototyping.json MUST contain an executionPlan
 * object. v1.8.4 Phase 9 BREAKING: removed the legacy
 * `validateExecutionPlan` / `ExecutionPlanIssue` exports; callers MUST use
 * `validateExecutionPlanIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

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
 * Verifies that prototyping.json has an `executionPlan` object when running
 * in full-harness mode. Issues `QFAI-PROT-310` for absence/invalid input.
 */
export function validateExecutionPlanIssues(
  prototypingJson: unknown,
  prototypingJsonPath: string,
): Issue[] {
  const mode = detectMode(prototypingJson);
  if (mode !== "full-harness") {
    return [];
  }

  const message = (() => {
    if (!isRecord(prototypingJson)) {
      return "executionPlan is required in full-harness mode but prototyping record is invalid.";
    }
    if (!isRecord(prototypingJson.executionPlan)) {
      return "executionPlan is required in full-harness mode but is absent or not an object in prototyping.json.";
    }
    return null;
  })();

  if (message === null) return [];

  return [
    issue(
      "QFAI-PROT-310",
      message,
      "error",
      prototypingJsonPath,
      "prototyping.executionPlan.presence",
      undefined,
      "canonical",
      "full-harness モードでは `prototyping.json.executionPlan` を記録してください " +
        "(targetIterations / evaluationAxesSource / delegationMap / plannedAt)。",
    ),
  ];
}
