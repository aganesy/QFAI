/**
 * Delegation map validator — verifies prototyping.json delegationMap entries
 * against the SKILL.md Delegation Scope Table allowed roles per category.
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateDelegationMap` /
 * `DelegationViolationIssue` exports; callers MUST use
 * `validateDelegationMapIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

const DELEGATION_SCOPE: Record<string, readonly string[]> = {
  UI実装: ["frontend-engineer", "product-experience-architect"],
  スクリーンショット: ["devops-ci-engineer"],
  評価スコアリング: ["product-surface-reviewer", "product-experience-architect"],
  ビルド: ["devops-ci-engineer", "backend-engineer"],
};

export const DELEGATION_CATEGORIES = Object.keys(DELEGATION_SCOPE) as readonly string[];

/**
 * Verifies that every delegationMap entry assigns a category to a role from
 * the SKILL.md Delegation Scope Table. Issues `QFAI-PROT-311` per
 * mismatched assignment.
 *
 * `delegationMap` may be undefined (no executionPlan / map missing) — in
 * that case `validateExecutionPlanIssues` (QFAI-PROT-310) covers the
 * "executionPlan absent" case and we silently no-op.
 */
export function validateDelegationMapIssues(
  delegationMap: Record<string, string> | undefined,
  prototypingJsonPath: string,
): Issue[] {
  if (!delegationMap) {
    return [];
  }

  const issues: Issue[] = [];
  for (const [category, role] of Object.entries(delegationMap)) {
    const allowedRoles = DELEGATION_SCOPE[category];
    if (allowedRoles === undefined) {
      // Unknown category is not flagged here (scope violation is a separate
      // concern handled outside this validator).
      continue;
    }
    if (!allowedRoles.includes(role)) {
      issues.push(
        issue(
          "QFAI-PROT-311",
          `Delegation violation: category "${category}" assigned to undefined/invalid role "${role}". Allowed roles: ${allowedRoles.join(", ")}.`,
          "error",
          prototypingJsonPath,
          "prototyping.executionPlan.delegationMap",
          undefined,
          "canonical",
          `category "${category}" を許可された role に割り当ててください ` +
            `(allowed: ${allowedRoles.join(", ")})。`,
        ),
      );
    }
  }
  return issues;
}
