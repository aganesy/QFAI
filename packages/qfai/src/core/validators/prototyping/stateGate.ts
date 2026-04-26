/**
 * Prototyping state-gate orchestrator (v1.8.4).
 *
 * Reads .qfai/evidence/prototyping.json once and dispatches it to the
 * standalone presence validators that need the same JSON document:
 *   - validateExecutionPlanIssues  (QFAI-PROT-310)
 *   - validateDelegationMapIssues  (QFAI-PROT-311)
 *
 * Wired into runPrototypingValidators (validate.ts) in Phase 2. This
 * orchestrator pattern avoids parsing prototyping.json multiple times
 * and keeps each individual validator independently unit-testable.
 *
 * If prototyping.json is absent or malformed, no issues are emitted from
 * this orchestrator — `validatePrototypingEvidence` already raises
 * QFAI-PROT-150 for that case, so we silently no-op to avoid duplicate
 * error noise.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { validateDelegationMapIssues } from "./delegationMap.js";
import { validateExecutionPlanIssues } from "./executionPlan.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractDelegationMap(prototypingJson: unknown): Record<string, string> | undefined {
  if (!isRecord(prototypingJson)) return undefined;
  const executionPlan = prototypingJson.executionPlan;
  if (!isRecord(executionPlan)) return undefined;
  const delegationMap = executionPlan.delegationMap;
  if (!isRecord(delegationMap)) return undefined;
  // Ensure every value is a string before passing to the validator.
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(delegationMap)) {
    if (typeof value === "string") {
      normalized[key] = value;
    }
  }
  return normalized;
}

export async function validateStateGate(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const evidenceRoot = path.join(
    path.dirname(path.resolve(root, config.paths.specsDir)),
    "evidence",
  );
  const prototypingJsonPath = path.join(evidenceRoot, "prototyping.json");

  let raw: string;
  try {
    raw = await readFile(prototypingJsonPath, "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const relPath = path.relative(root, prototypingJsonPath).replace(/\\/g, "/");

  const issues: Issue[] = [];
  issues.push(...validateExecutionPlanIssues(parsed, relPath));
  issues.push(...validateDelegationMapIssues(extractDelegationMap(parsed), relPath));
  return issues;
}
