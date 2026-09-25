import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { AssistantAssetConflict } from "../../core/assistantAssetProvenance.js";
import { ASSISTANT_DIR } from "../../core/paths/assistantPaths.js";
import { checkInstalledPlans, type PlanRefusal } from "../../core/workflow/plans.js";

const ROUTING = "manifest/agent-routing.yml";

/**
 * The files an upgrade leaves in conflict with the workflow's correspondence check: the check
 * `start` enforces, from the same module, so init and `start` never disagree. One entry per file,
 * its differences joined, keyed by its path under `.qfai/assistant/`.
 */
export async function findWorkflowConflicts(destRoot: string): Promise<AssistantAssetConflict[]> {
  const check = await checkInstalledPlans(destRoot);
  if (check.cause === "contract-undeclared") {
    return mergeByPath(check.refusals.map(contractConflict));
  }
  if (check.cause === "reviewer-missing") {
    return mergeByPath(reviewerConflicts(check.refusals, await routedSkills(destRoot)));
  }
  return [];
}

/**
 * The summary lines standing in for the plain mode line while mode `active` has conflicts: each
 * file once with its difference and trigger, then the line saying `active` will not start.
 */
export function workflowConflictLines(conflicts: readonly AssistantAssetConflict[]): string[] {
  return [
    "Workflow conflicts:",
    ...conflicts.map(
      (conflict) =>
        `  ${ASSISTANT_DIR}/${conflict.path}: ${conflict.difference} (${conflict.trigger})`,
    ),
    "Workflow mode: active is configured and will not start until these conflicts are resolved",
  ];
}

const OPERATIONS_TABLE: Partial<Record<PlanRefusal["reason"], string>> = {
  "operations-table-missing": "has no Operations table",
  "operations-first-column": "has an Operations table whose first column is not Operation",
  "operations-cell-not-id": "has an Operations table cell that is not an operation ID",
};

// A trigger (b) refusal, placed on the plan or the skill file it is about.
function contractConflict(refusal: PlanRefusal): AssistantAssetConflict {
  const trigger = "contract-undeclared";
  const [skill = refusal.subject, operation] = refusal.subject.split(":");
  const table = `skills/${skill}/references/orchestrated-mode.md`;
  const tableDifference = OPERATIONS_TABLE[refusal.reason];
  if (tableDifference !== undefined) return { path: table, trigger, difference: tableDifference };
  if (refusal.reason === "operations-pair-omitted") {
    return { path: table, trigger, difference: `does not declare ${String(operation)}` };
  }
  if (refusal.reason === "skill-missing") {
    return { path: `skills/${skill}`, trigger, difference: "is missing" };
  }
  const plan = `process/workflows/${refusal.route}.yml`;
  if (refusal.reason === "plan-differs") {
    return { path: plan, trigger, difference: "differs from the shipped plan" };
  }
  if (refusal.reason === "file-missing") return { path: plan, trigger, difference: "is missing" };
  return {
    path: plan,
    trigger,
    difference: `does not load (${refusal.reason} at ${refusal.subject})`,
  };
}

// Trigger (c) refusals: a skill the project routes nowhere is one absent entry, which `--force`
// adds; a reviewer dropped from an entry the project declares is named without that command.
function reviewerConflicts(
  refusals: readonly PlanRefusal[],
  routed: ReadonlySet<string>,
): AssistantAssetConflict[] {
  const trigger = "reviewer-missing";
  const absent = new Set<string>();
  const conflicts: AssistantAssetConflict[] = [];
  for (const refusal of refusals) {
    const [skill = refusal.subject, phase, agent] = refusal.subject.split(":");
    if (!routed.has(skill)) {
      absent.add(skill);
      continue;
    }
    const difference = `${skill} phase ${String(phase)} no longer blocks on ${String(agent)}`;
    conflicts.push({ path: ROUTING, trigger, difference });
  }
  const added = [...absent].map((skill): AssistantAssetConflict => ({
    path: ROUTING,
    trigger,
    difference: `has no routing entry for ${skill}, which qfai init --force adds`,
  }));
  return [...added, ...conflicts];
}

// The skills the project's routing manifest has an entry for. The correspondence check has
// already read the file, so one it could not read routes nothing here either.
async function routedSkills(destRoot: string): Promise<Set<string>> {
  let document: unknown;
  try {
    document = parseYaml(await readFile(path.join(destRoot, ASSISTANT_DIR, ROUTING), "utf-8"));
  } catch {
    return new Set();
  }
  const routing =
    typeof document === "object" && document !== null && "routing" in document
      ? document.routing
      : undefined;
  const skills = Array.isArray(routing)
    ? routing.map((entry: unknown) =>
        typeof entry === "object" && entry !== null && "skill" in entry ? entry.skill : undefined,
      )
    : [];
  return new Set(skills.filter((skill): skill is string => typeof skill === "string"));
}

// One entry per file, in first-seen order, its differences joined.
function mergeByPath(conflicts: readonly AssistantAssetConflict[]): AssistantAssetConflict[] {
  const byPath = new Map<string, AssistantAssetConflict>();
  for (const conflict of conflicts) {
    const seen = byPath.get(conflict.path);
    if (seen === undefined) {
      byPath.set(conflict.path, { ...conflict });
      continue;
    }
    if (!seen.difference.split("; ").includes(conflict.difference)) {
      seen.difference = `${seen.difference}; ${conflict.difference}`;
    }
  }
  return [...byPath.values()];
}
