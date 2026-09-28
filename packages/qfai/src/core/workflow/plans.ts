import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { QfaiConfig } from "../config.js";
import { readEffectiveRouting } from "../validators/agentDefinition.js";
import type { SkillRouting } from "../validators/skillRoles.js";
import { isRecord } from "./parse.js";
import { parsePlan, type PlanLoad, type PlanRefusal, type WorkflowPlanFile } from "./planFormat.js";
import { WORKFLOW_ROUTES, type WorkflowRoute } from "./routes.js";
import { stepPath } from "./steps.js";

export { WORKFLOW_ROUTES, type WorkflowRoute } from "./routes.js";
export {
  parsePlan,
  PASS_THROUGH_STEPS,
  type PlanBranchPoint,
  type PlanLoad,
  type PlanRefusal,
  type PlanRefusalReason,
  type PlanStage,
  type WorkflowPlanFile,
} from "./planFormat.js";

// The verdict over the package's plans, the steps they name and the reviewers the effective
// routing keeps: a refusal is the cause `contract-undeclared` or `reviewer-missing`.
export interface PlanCheck {
  cause?: "contract-undeclared" | "reviewer-missing";
  refusals: PlanRefusal[];
}

// Where the plans sit: in the installed package, never in a project.
export function packagePlansDir(): string {
  return path.resolve(getInitAssetsDir(), "..", "defaults", "workflows");
}

// The name a plan's digest is recorded under: its path inside the package.
export function planDigestKey(route: WorkflowRoute): string {
  return `assets/defaults/workflows/${route}.yml`;
}

async function readIfPresent(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

// One of the package's plans, loaded or refused.
export async function loadPackagePlan(route: WorkflowRoute): Promise<PlanLoad> {
  const text = await readIfPresent(path.join(packagePlansDir(), `${route}.yml`));
  if (text === undefined) {
    return { ok: false, refusals: [{ route, reason: "file-missing", subject: route }] };
  }
  return parsePlan(text, route);
}

// The package's own plans, which are the ones a run follows. A plan that does not load is
// trigger (b), which `start` refuses before any run reads the plans, so here it throws.
export async function loadBuiltInPlans(): Promise<WorkflowPlanFile[]> {
  return Promise.all(
    WORKFLOW_ROUTES.map(async (route) => {
      const load = await loadPackagePlan(route);
      if (!load.ok) throw new Error(`The packaged ${route} plan does not load.`);
      return load.plan;
    }),
  );
}

// Every step the loaded plans run, with the first route running it.
function planSteps(plans: readonly WorkflowPlanFile[]): Map<string, string> {
  const steps = new Map<string, string>();
  for (const plan of plans) {
    for (const step of plan.stages.flatMap((stage) => stage.steps)) {
      if (!steps.has(step.name)) steps.set(step.name, plan.route);
    }
  }
  return steps;
}

// Each step a plan runs that is not installed: `<assistant>/step/<name>/STEP.md` is no file.
async function contractRefusals(root: string, steps: Map<string, string>): Promise<PlanRefusal[]> {
  const found = await Promise.all(
    [...steps].map(async ([step, route]): Promise<PlanRefusal[]> => {
      const entry = await stat(path.join(root, stepPath(step))).catch(() => undefined);
      return entry?.isFile() ? [] : [{ route, reason: "step-missing", subject: step }];
    }),
  );
  return found.flat();
}

function requiredAgents(routing: Map<string, SkillRouting> | undefined, step: string): string[] {
  const agents = routing?.get(step)?.agents ?? new Map<string, string>();
  return [...agents].filter(([, binding]) => binding === "required").map(([agent]) => agent);
}

// Every agent the package's default routing requires for a step a plan runs must still be
// required by the effective routing. An agent the project adds is the project's.
async function reviewerRefusals(
  config: Pick<QfaiConfig, "routing" | "reviewProfiles">,
  steps: Map<string, string>,
): Promise<PlanRefusal[]> {
  const { routing, defaultRouting } = await readEffectiveRouting(config);
  const refusals: PlanRefusal[] = [];
  for (const [step, route] of steps) {
    const kept = requiredAgents(routing, step);
    for (const agent of requiredAgents(defaultRouting, step)) {
      if (!kept.includes(agent)) {
        refusals.push({ route, reason: "reviewer-missing", subject: `${step}:${agent}` });
      }
    }
  }
  return refusals;
}

// Every refusal of both triggers, for a caller that reports each failed check rather than
// stopping at the first cause as `checkPlans` does.
export async function allPlanRefusals(
  projectRoot: string,
  config: Pick<QfaiConfig, "routing" | "reviewProfiles">,
): Promise<PlanRefusal[]> {
  const loaded = await Promise.all(WORKFLOW_ROUTES.map((route) => loadPackagePlan(route)));
  const steps = planSteps(loaded.flatMap((load) => (load.ok ? [load.plan] : [])));
  return [
    ...loaded.flatMap((load) => (load.ok ? [] : load.refusals)),
    ...(await contractRefusals(projectRoot, steps)),
    ...(await reviewerRefusals(config, steps)),
  ];
}

// Trigger (b) over the package's plans and the steps they name, then trigger (c) over the
// reviewers the effective routing keeps. The first that holds is the cause.
export async function checkPlans(
  projectRoot: string,
  config: Pick<QfaiConfig, "routing" | "reviewProfiles">,
): Promise<PlanCheck> {
  const loaded = await Promise.all(WORKFLOW_ROUTES.map((route) => loadPackagePlan(route)));
  const loadRefusals = loaded.flatMap((load) => (load.ok ? [] : load.refusals));
  if (loadRefusals.length > 0) return { cause: "contract-undeclared", refusals: loadRefusals };
  const steps = planSteps(loaded.flatMap((load) => (load.ok ? [load.plan] : [])));
  const contract = await contractRefusals(projectRoot, steps);
  if (contract.length > 0) return { cause: "contract-undeclared", refusals: contract };
  const reviewers = await reviewerRefusals(config, steps);
  return reviewers.length > 0
    ? { cause: "reviewer-missing", refusals: reviewers }
    : { refusals: [] };
}
