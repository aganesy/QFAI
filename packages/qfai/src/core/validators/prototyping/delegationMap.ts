/**
 * Delegation map validator — verifies prototyping.json delegationMap entries
 * against the SKILL.md Delegation Scope Table allowed roles per category.
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateDelegationMap` /
 * `DelegationViolationIssue` exports; callers MUST use
 * `validateDelegationMapIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { PROTOTYPING_DELEGATION_SCOPE } from "../../prototyping/policy.js";
import { issue } from "../utils.js";

export const DELEGATION_CATEGORIES = Object.keys(PROTOTYPING_DELEGATION_SCOPE) as readonly string[];

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
  delegationMap: Record<string, unknown> | undefined,
  prototypingJsonPath: string,
): Issue[] {
  if (!delegationMap) {
    return [];
  }

  const issues: Issue[] = [];
  for (const [category, rawRole] of Object.entries(delegationMap)) {
    if (!(category in PROTOTYPING_DELEGATION_SCOPE)) {
      // Unknown category is not flagged here (scope violation is a separate
      // concern handled outside this validator).
      continue;
    }
    const allowedRoles = PROTOTYPING_DELEGATION_SCOPE[
      category as keyof typeof PROTOTYPING_DELEGATION_SCOPE
    ] as readonly string[];
    // Non-string values used to be filtered out in stateGate.extractDelegationMap
    // and slipped through silently. Flag them explicitly so malformed entries
    // like { UI実装: 123 } surface a real violation. (Codex review on PR #201.)
    if (typeof rawRole !== "string") {
      issues.push(
        issue(
          "QFAI-PROT-311",
          `Delegation violation: category "${category}" assigned to non-string value (got: ${describeRoleType(rawRole)}). Allowed roles: ${allowedRoles.join(", ")}.`,
          "error",
          prototypingJsonPath,
          "prototyping.executionPlan.delegationMap",
          undefined,
          "canonical",
          `category "${category}" には string の role を割り当ててください ` +
            `(allowed: ${allowedRoles.join(", ")})。`,
        ),
      );
      continue;
    }
    if (!allowedRoles.includes(rawRole)) {
      issues.push(
        issue(
          "QFAI-PROT-311",
          `Delegation violation: category "${category}" assigned to undefined/invalid role "${rawRole}". Allowed roles: ${allowedRoles.join(", ")}.`,
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

function describeRoleType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
