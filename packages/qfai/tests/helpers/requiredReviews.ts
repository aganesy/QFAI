import type { WorkflowReview } from "../../src/core/workflow/types.js";

/** Synthetic review payloads for positive test setup, not observed review evidence. */
export function requiredReviews(requiredRoles: unknown, resultId: string): WorkflowReview[] {
  if (!Array.isArray(requiredRoles)) throw new Error("The issued work order has no reviewer list");
  const roles: unknown[] = requiredRoles;
  return roles.map((role) => {
    if (typeof role !== "string") throw new Error("The issued reviewer role is not a string");
    return {
      role,
      agentInstance: `${role}-${resultId}`,
      verdict: "PASS",
      reportRef: `${role}.md`,
    };
  });
}
