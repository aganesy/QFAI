/**
 * Review results for a workflow test's stage result: `accept` refuses an accepted result without a
 * PASS from every role its work order requires, so a test that is not about reviews gives one.
 */

export interface ReviewResult {
  role: string;
  agentInstance: string;
  verdict: string;
  reportRef: string;
}

/**
 * The review results `named` holds, then a PASS from an instance of its own for each role in
 * `requiredRoles` that `named` does not already cover.
 */
export function requiredReviews<T>(
  requiredRoles: unknown,
  resultId: string,
  named: readonly T[] = [],
): (T | ReviewResult)[] {
  const covered = new Set(
    named.map((review) =>
      typeof review === "object" && review !== null && "role" in review ? review.role : undefined,
    ),
  );
  const roles: unknown[] = Array.isArray(requiredRoles) ? requiredRoles : [];
  const missing = roles.filter(
    (role): role is string => typeof role === "string" && !covered.has(role),
  );
  return [
    ...named,
    ...missing.map((role) => ({
      role,
      agentInstance: `${role}-${resultId}`,
      verdict: "PASS",
      reportRef: `${role}.md`,
    })),
  ];
}
