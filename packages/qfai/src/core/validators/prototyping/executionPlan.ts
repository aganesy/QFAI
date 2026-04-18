/**
 * executionPlan presence validator for full-harness prototyping.
 *
 * When mode=full-harness, prototyping.json MUST contain an executionPlan object
 * with targetIterations, evaluationAxesSource, delegationMap, and plannedAt.
 *
 * spec-0012 TC-0012-0290 / AC-0012-0175
 */

export interface ExecutionPlanIssue {
  readonly rule: "PROT-EXEC-PLAN";
  readonly message: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function detectMode(raw: unknown): string {
  if (!isRecord(raw)) return "other";
  if (typeof raw.mode === "string") return raw.mode;
  if (typeof raw.recommended_mode === "string") return raw.recommended_mode;
  if (isRecord(raw.prototyping) && typeof raw.prototyping.recommended_mode === "string") {
    return raw.prototyping.recommended_mode;
  }
  return "other";
}

export function validateExecutionPlan(prototypingJson: unknown): ExecutionPlanIssue[] {
  const mode = detectMode(prototypingJson);
  if (mode !== "full-harness") {
    return [];
  }

  if (!isRecord(prototypingJson)) {
    return [
      {
        rule: "PROT-EXEC-PLAN",
        message: "executionPlan is required in full-harness mode but prototyping record is invalid.",
      },
    ];
  }

  if (!isRecord(prototypingJson.executionPlan)) {
    return [
      {
        rule: "PROT-EXEC-PLAN",
        message:
          "executionPlan is required in full-harness mode but is absent or not an object in prototyping.json.",
      },
    ];
  }

  return [];
}
