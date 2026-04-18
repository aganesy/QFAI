/**
 * Delegation map validator — verifies prototyping.json delegationMap entries
 * against the SKILL.md Delegation Scope Table allowed roles per category.
 *
 * spec-0012 TC-0012-0286 / AC-0012-0171
 */

export interface DelegationViolationIssue {
  readonly rule: "PROT-DELEGATION";
  readonly category: string;
  readonly invalidRole: string;
  readonly message: string;
}

const DELEGATION_SCOPE: Record<string, readonly string[]> = {
  "UI実装": ["frontend-engineer", "product-experience-architect"],
  "スクリーンショット": ["devops-ci-engineer"],
  "評価 L1-L2": ["product-surface-reviewer", "product-experience-architect"],
  "ビルド": ["devops-ci-engineer", "backend-engineer"],
};

export const DELEGATION_CATEGORIES = Object.keys(DELEGATION_SCOPE) as readonly string[];

export function validateDelegationMap(
  delegationMap: Record<string, string>,
): DelegationViolationIssue[] {
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
