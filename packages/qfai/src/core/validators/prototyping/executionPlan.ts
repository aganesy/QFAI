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

type FieldShape = "number" | "non-empty-string" | "record";

/**
 * User-facing description for each shape. Avoid exposing the internal
 * `non-empty-string` literal in error messages — operators care about
 * "non-empty string" / "object". (Copilot MINOR review on PR #201.)
 */
const FIELD_SHAPE_LABEL: Record<FieldShape, string> = {
  number: "finite number",
  "non-empty-string": "non-empty string",
  record: "object (not array)",
};

const REQUIRED_FIELDS: ReadonlyArray<{ key: string; shape: FieldShape }> = [
  { key: "targetIterations", shape: "number" },
  { key: "evaluationAxesSource", shape: "non-empty-string" },
  { key: "delegationMap", shape: "record" },
  { key: "plannedAt", shape: "non-empty-string" },
];

/**
 * User-facing type label. `typeof null` is "object" and `typeof []` is also
 * "object", which leaves operators guessing what they actually passed in.
 * Distinguish these explicitly. (Copilot NIT review on PR #201.)
 */
function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matchesShape(value: unknown, shape: FieldShape): boolean {
  switch (shape) {
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "non-empty-string":
      // .trim() catches whitespace-only strings (e.g. "   ") that would
      // otherwise pass a length-only check (Copilot MAJOR review on PR #201).
      return typeof value === "string" && value.trim().length > 0;
    case "record":
      // record === plain object (NOT array, NOT null). delegationMap as an
      // array would otherwise pass typeof===object.
      return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}

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
 * `QFAI-PROT-310` for absence or missing/empty required field.
 *
 * Implementation note: `isRecord` runs before `detectMode` so the rest of the
 * function can rely on `prototypingJson` being a record. The previous order —
 * `detectMode` first, then a second `isRecord` check — left the second branch
 * unreachable because `detectMode` already returns `"other"` for non-records.
 * (Copilot NIT review on PR #201, comment 3145610423.)
 */
export function validateExecutionPlanIssues(
  prototypingJson: unknown,
  prototypingJsonPath: string,
): Issue[] {
  if (!isRecord(prototypingJson)) {
    return [];
  }
  if (detectMode(prototypingJson) !== "full-harness") {
    return [];
  }

  if (!isRecord(prototypingJson.executionPlan)) {
    return [
      buildIssue(
        "executionPlan is required in full-harness mode but is absent or not an object in prototyping.json.",
        prototypingJsonPath,
      ),
    ];
  }

  // Field-level validation: each required field must be present, non-empty,
  // AND of the correct shape. Reviewer comments on PR #201 flagged that
  // checking only presence let mis-typed values through (e.g. targetIterations
  // as a string, delegationMap as an array).
  const issues: Issue[] = [];
  const executionPlan = prototypingJson.executionPlan;
  for (const { key, shape } of REQUIRED_FIELDS) {
    const value = executionPlan[key];
    if (!matchesShape(value, shape)) {
      issues.push(
        buildIssue(
          `executionPlan.${key} is required in full-harness mode and must be a ${FIELD_SHAPE_LABEL[shape]} (got: ${describeType(value)}).`,
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
