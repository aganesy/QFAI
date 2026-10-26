import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
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
  type PlanStep,
  type WorkflowPlanFile,
} from "./planFormat.js";

// Where the plans sit: in the installed package, never in a project.
export function packagePlansDir(): string {
  return path.resolve(getInitAssetsDir(), "..", "defaults", "workflows");
}

// The file's text, `undefined` when it does not exist, and `null` when it cannot be read.
async function readIfPresent(file: string): Promise<string | null | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    return null;
  }
}

// One of the package's plans, loaded or refused.
export async function loadPackagePlan(route: WorkflowRoute): Promise<PlanLoad> {
  const text = await readIfPresent(path.join(packagePlansDir(), `${route}.yml`));
  if (text === undefined) {
    return { ok: false, refusals: [{ route, reason: "file-missing", subject: route }] };
  }
  if (text === null) {
    return { ok: false, refusals: [{ route, reason: "unreadable", subject: route }] };
  }
  return parsePlan(text, route);
}

// The package's own plans. A shipped plan that does not load is a defect of the package, so
// here it throws.
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

// One of the package's plans, refused as well when a step it runs is not installed in the
// project.
export async function loadInstalledPlan(root: string, route: WorkflowRoute): Promise<PlanLoad> {
  const load = await loadPackagePlan(route);
  if (!load.ok) return load;
  const missing = await contractRefusals(root, planSteps([load.plan]));
  return missing.length > 0 ? { ok: false, refusals: missing } : load;
}

// Every refusal over the package's plans and the steps they run.
export async function allPlanRefusals(projectRoot: string): Promise<PlanRefusal[]> {
  const loaded = await Promise.all(WORKFLOW_ROUTES.map((route) => loadPackagePlan(route)));
  const steps = planSteps(loaded.flatMap((load) => (load.ok ? [load.plan] : [])));
  return [
    ...loaded.flatMap((load) => (load.ok ? [] : load.refusals)),
    ...(await contractRefusals(projectRoot, steps)),
  ];
}
