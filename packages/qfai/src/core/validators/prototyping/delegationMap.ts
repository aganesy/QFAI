/**
 * Delegation map validator — verifies prototyping.json delegationMap entries
 * against the SKILL.md Delegation Scope Table allowed roles per category.
 *
 * spec-0012 TC-0012-0286 / AC-0012-0171
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

/**
 * @deprecated v1.8.4: kept for backward compatibility. New code MUST use
 * `validateDelegationMapIssues`. Will be removed once Phase 7 lands.
 */
export interface DelegationViolationIssue {
  readonly rule: "PROT-DELEGATION";
  readonly category: string;
  readonly invalidRole: string;
  readonly message: string;
}

const DELEGATION_SCOPE: Record<string, readonly string[]> = {
  UI実装: ["frontend-engineer", "product-experience-architect"],
  スクリーンショット: ["devops-ci-engineer"],
  評価スコアリング: ["product-surface-reviewer", "product-experience-architect"],
  ビルド: ["devops-ci-engineer", "backend-engineer"],
};

export const DELEGATION_CATEGORIES = Object.keys(DELEGATION_SCOPE) as readonly string[];

/**
 * @deprecated v1.8.4: use `validateDelegationMapIssues`.
 */
export function validateDelegationMap(
  delegationMap: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
): DelegationViolationIssue[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
  const issues: DelegationViolationIssue[] = [];

  for (const [category, role] of Object.entries(delegationMap)) {
    const allowedRoles = DELEGATION_SCOPE[category];
    if (allowedRoles === undefined) {
      // Unknown category is not flagged by this validator (scope violation is separate)
      continue;
    }
    if (!allowedRoles.includes(role)) {
      issues.push({
        rule: "PROT-DELEGATION",
        category,
        invalidRole: role,
        message: `Delegation violation: category "${category}" assigned to undefined/invalid role "${role}". Allowed roles: ${allowedRoles.join(", ")}.`,
      });
    }
  }

  return issues;
}

/**
 * v1.8.4 standard adapter. Returns `Issue[]` so the validator participates in
 * `runPrototypingValidators` and `--fail-on error` aggregation.
 *
 * Issued code: `QFAI-PROT-311`.
 *
 * If `delegationMap` is undefined (no executionPlan or block missing the key),
 * we return no issues here — `validateExecutionPlanIssues` (QFAI-PROT-310)
 * already covers the "executionPlan absent" case.
 */
export function validateDelegationMapIssues(
  delegationMap: Record<string, string> | undefined,
  prototypingJsonPath: string,
): Issue[] {
  if (!delegationMap) {
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- adapter intentionally bridges legacy implementation
  return validateDelegationMap(delegationMap).map((custom) =>
    issue(
      "QFAI-PROT-311",
      custom.message,
      "error",
      prototypingJsonPath,
      "prototyping.executionPlan.delegationMap",
      undefined,
      "canonical",
      `category "${custom.category}" を許可された role に割り当ててください ` +
        `(allowed: ${(DELEGATION_SCOPE[custom.category] ?? []).join(", ")})。`,
    ),
  );
}
