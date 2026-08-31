/**
 * Delegation map validator — verifies prototyping.json delegationMap
 * entries against the SKILL.md Delegation Scope Table allowed roles per
 * category. `validatePrototypingDelegationMap` is the wiring entry point
 * used by `runPrototypingValidators`; it reads the artifact and delegates
 * to `validateDelegationMapIssues`, which returns standard `Issue[]` for a
 * map that is already in hand.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PROTOTYPING_JSON_REL } from "../../prototyping/paths.js";
import type { Issue } from "../../types.js";
import { PROTOTYPING_DELEGATION_SCOPE, resolveDelegationScope } from "../../prototyping/policy.js";
import { issue } from "../utils.js";

export const DELEGATION_CATEGORIES = Object.keys(PROTOTYPING_DELEGATION_SCOPE) as readonly string[];

/**
 * Reads `prototyping.json#executionPlan.delegationMap` and runs the scope
 * check on it. This is the production entry point wired into
 * `runPrototypingValidators`.
 *
 * It exists because `validateDelegationMapIssues` takes the map, not the
 * project, so nothing in `validate.ts` could call it — extracting the map was
 * `stateGate.ts`'s job, and that module returned `[]` and has been deleted.
 * The result was a validator the barrel re-exported, the wiring guard counted
 * as reachable, and no run ever executed: an invalid `delegationMap` raised no
 * `QFAI-PROT-311` at all.
 *
 * Silent no-op when prototyping.json is missing / unparseable / carries no
 * `executionPlan.delegationMap`: the prototyping profile runs on projects that
 * have not started a cycle, and the `executionPlan`-absent case belongs to a
 * different rule. A `delegationMap` that IS present but is not an object
 * (string / array / null) is a violation reported here — no other
 * validator owns the executionPlan block, so it would otherwise pass
 * every profile silently.
 */
export async function validatePrototypingDelegationMap(root: string): Promise<Issue[]> {
  const doc = await readPrototypingJsonObject(path.join(root, PROTOTYPING_JSON_REL));
  const executionPlan = asRecord(doc?.executionPlan);
  if (executionPlan === undefined || !Object.hasOwn(executionPlan, "delegationMap")) {
    return [];
  }
  const rawMap = executionPlan.delegationMap;
  const delegationMap = asRecord(rawMap);
  if (delegationMap === undefined) {
    return [
      issue(
        "QFAI-PROT-311",
        `Delegation violation: executionPlan.delegationMap must be an object mapping categories to roles (got: ${describeRoleType(rawMap)}).`,
        "error",
        PROTOTYPING_JSON_REL,
        "prototyping.executionPlan.delegationMap",
        undefined,
        "canonical",
        "`executionPlan.delegationMap` を category -> role の object にしてください " +
          "(不要になった executionPlan ブロックは削除してください)。",
      ),
    ];
  }
  return validateDelegationMapIssues(delegationMap, PROTOTYPING_JSON_REL);
}

async function readPrototypingJsonObject(
  absPath: string,
): Promise<Record<string, unknown> | undefined> {
  let raw: string;
  try {
    raw = await readFile(absPath, "utf-8");
  } catch {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return asRecord(parsed);
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isPlainObject(value) ? value : undefined;
}

/**
 * Verifies that every delegationMap entry assigns a category to a role from
 * the SKILL.md Delegation Scope Table. Issues `QFAI-PROT-311` per
 * mismatched assignment.
 *
 * `delegationMap` may be undefined (no executionPlan / map missing) — in
 * that case the loop simply has nothing to delegate and we silently no-op.
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
    // Resolves both the canonical scope keys and the shipped SKILL.md
    // Delegation Scope Table labels (e.g. "Generation"), so a map written
    // against the distributed table is checked — against the roles that
    // table's own row documents, not the wider canonical set.
    const allowedRoles = resolveDelegationScope(category);
    if (allowedRoles === undefined) {
      // Unknown category is not flagged here (scope violation is a separate
      // concern handled outside this validator).
      continue;
    }
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
