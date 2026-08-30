/**
 * Delegation map validator — verifies prototyping.json delegationMap
 * entries against the SKILL.md Delegation Scope Table allowed roles per
 * category. Callers use `validateDelegationMapIssues` which returns
 * standard `Issue[]`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PROTOTYPING_JSON_REL } from "../../prototyping/paths.js";
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
    if (!Object.hasOwn(PROTOTYPING_DELEGATION_SCOPE, category)) {
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

/**
 * The dispatched form: read the map out of `prototyping.json` and judge it.
 *
 * `validateDelegationMapIssues` takes the map, not the project, so nothing in
 * `validate.ts` could call it — extracting the map was `stateGate.ts`'s job,
 * and that module returned `[]` and was deleted. The result was a validator
 * the barrel re-exported, the wiring guard counted as reachable, and no run
 * ever executed: an invalid `delegationMap` raised no `QFAI-PROT-311` at all.
 *
 * Absence is silence at every level — no file, unreadable file, no
 * `executionPlan`, no `delegationMap` — because the prototyping profile runs
 * on projects that have not started a prototyping cycle, and the
 * `executionPlan`-absent case belongs to a different rule.
 */
export async function validatePrototypingDelegationMap(root: string): Promise<Issue[]> {
  return validateDelegationMapIssues(await readDelegationMap(root), PROTOTYPING_JSON_REL);
}

async function readDelegationMap(root: string): Promise<Record<string, unknown> | undefined> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8"));
  } catch {
    return undefined;
  }
  const executionPlan = asRecord(parsed)?.executionPlan;
  return asRecord(asRecord(executionPlan)?.delegationMap);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}
