import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { getInitAssetsDir } from "../../shared/assets.js";
import type { QfaiConfig } from "../config.js";
import { readEffectiveRouting } from "../validators/agentDefinition.js";
import type { SkillRouting } from "../validators/skillRoles.js";
import { isRecord } from "./parse.js";
import { SEAM_STEP, stepPath } from "./steps.js";
import type { PlanStep } from "./types.js";

export const WORKFLOW_ROUTES = [
  "direct",
  "bugfix",
  "bounded-change",
  "feature",
  "discovery",
] as const;

export type WorkflowRoute = (typeof WORKFLOW_ROUTES)[number];

export interface PlanStage {
  id: string;
  kind: string;
  steps: PlanStep[];
  when: string;
  after: string[];
  effects: string[];
}

export interface WorkflowPlanFile {
  route: WorkflowRoute;
  stages: PlanStage[];
}

export type PlanRefusalReason =
  | "file-missing"
  | "not-mapping"
  | "unknown-key"
  | "route-name"
  | "shape"
  | "effects"
  | "out-of-vocabulary"
  | "kind-mismatch"
  | "after-missing"
  | "cycle"
  | "unreachable"
  | "no-verify-path"
  | "step-missing"
  | "reviewer-missing";

// Why a plan was refused, and the key, stage, step or route the refusal is about.
export interface PlanRefusal {
  route: WorkflowRoute;
  reason: PlanRefusalReason;
  subject: string;
}

export type PlanLoad =
  { ok: true; plan: WorkflowPlanFile } | { ok: false; refusals: PlanRefusal[] };

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

const PLAN_KEYS = ["route", "stages"];
const STAGE_KEYS = ["id", "kind", "steps", "when", "after", "effects"];
const STEP_KEYS = ["step", "when"];

const SDD_STEPS = ["sdd-triage", "sdd-flow", "sdd-story", "sdd-contract", "common-design-md"];

// Each stage kind, with the steps a stage of that kind may run.
const KINDS: Record<string, string[]> = {
  maintenance: ["maintain-edit"],
  diagnose: ["implement-diagnose"],
  sdd_append: ["sdd-story", "sdd-gate"],
  test_fix: ["atdd-test-fix", "implement-test-fix"],
  regression_fix: ["implement-regression-fix"],
  sdd: [...SDD_STEPS, "sdd-cycle", "sdd-gate"],
  sdd_delta: [...SDD_STEPS, "sdd-gate"],
  prototype: [
    "prototyping-grill",
    "prototyping-preflight",
    "prototyping-loop",
    "prototyping-handoff",
  ],
  acceptance: ["atdd-scaffold", "atdd-credentials", "atdd-author"],
  implement: ["implement-tdd", "implement-checkpoint"],
  verify: ["verify-context", "verify-qfai-gate", "verify-repo-gate"],
  discussion: [
    "discussion-research",
    "discussion-interview",
    "discussion-pack",
    "discussion-oq",
    "discussion-uiux",
  ],
};

// `implement-seam` is a step of the vocabulary that no plan stage may run.
const STEPS = new Set([...Object.values(KINDS).flat(), SEAM_STEP]);

const PREDICATES = [
  "always",
  "missing_example_needed",
  "diagnosis_missing_test",
  "test_defect_found",
  "regression_found",
  "acceptance_obligations_unmet",
  "prototype_decision_needed",
  "full_discussion_needed",
];

const STEP_PREDICATES = ["proposed", "test_defect_acceptance_layer", "test_defect_example_layer"];

const EFFECTS = [
  "push",
  "pull-request",
  "merge",
  "deploy",
  "production-migration",
  "extra-spending",
];

type Refuse = (reason: PlanRefusalReason, subject: string) => void;

// Record a refusal where the value it is about cannot be used.
function refused(refuse: Refuse, reason: PlanRefusalReason, subject: string): null {
  refuse(reason, subject);
  return null;
}

function unknownKeys(value: Record<string, unknown>, known: string[], refuse: Refuse) {
  for (const key of Object.keys(value)) if (!known.includes(key)) refuse("unknown-key", key);
}

function stringList(value: unknown): string[] | undefined {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  return undefined;
}

function vocabularyRefusals(stage: PlanStage, refuse: Refuse) {
  const kind = KINDS[stage.kind];
  const outside = [
    ...(kind ? [] : [stage.kind]),
    ...(PREDICATES.includes(stage.when) ? [] : [stage.when]),
    ...stage.steps.flatMap((step) => [
      ...(STEPS.has(step.name) ? [] : [step.name]),
      ...(step.when === undefined || STEP_PREDICATES.includes(step.when) ? [] : [step.when]),
    ]),
  ];
  for (const name of outside) refuse("out-of-vocabulary", name);
  if (outside.length > 0 || !kind) return;
  if (stage.steps.some((step) => !kind.includes(step.name))) refuse("kind-mismatch", stage.id);
}

// One step entry: a step name, or `{ step, when }` for a step with its own predicate.
function stepOf(value: unknown, refuse: Refuse): PlanStep | null {
  if (typeof value === "string") return { name: value };
  if (!isRecord(value)) return null;
  unknownKeys(value, STEP_KEYS, refuse);
  const { step, when } = value;
  if (typeof step !== "string" || (when !== undefined && typeof when !== "string")) return null;
  return when === undefined ? { name: step } : { name: step, when };
}

// A stage's steps, or undefined when the list is empty, holds a malformed entry or repeats one.
function stepsOf(value: unknown, refuse: Refuse): PlanStep[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const steps = value.map((entry) => stepOf(entry, refuse));
  if (!steps.every((step) => step !== null)) return undefined;
  const names = steps.map((step) => step.name);
  return new Set(names).size === names.length ? steps : undefined;
}

// One stage entry, or null when its shape is refused.
function stageOf(value: unknown, refuse: Refuse): PlanStage | null {
  if (!isRecord(value)) return refused(refuse, "shape", "stages");
  unknownKeys(value, STAGE_KEYS, refuse);
  const { id, kind, when } = value;
  const steps = stepsOf(value.steps, refuse);
  const after = value.after === undefined ? [] : stringList(value.after);
  const effects = value.effects === undefined ? [] : stringList(value.effects);
  if (!effects || effects.some((effect) => !EFFECTS.includes(effect))) {
    refuse("effects", typeof id === "string" ? id : "stages");
  }
  if (typeof id !== "string" || typeof kind !== "string" || !steps || !after) {
    return refused(refuse, "shape", typeof id === "string" ? id : "stages");
  }
  if (typeof when !== "string" || !effects) return refused(refuse, "shape", id);
  const stage = { id, kind, steps, when, after, effects };
  vocabularyRefusals(stage, refuse);
  return stage;
}

function followersOf(stages: PlanStage[], id: string): PlanStage[] {
  return stages.filter((stage) => stage.after.includes(id));
}

// The stages reached from `from` by following each stage to the ones that come after it.
function reachedFrom(stages: PlanStage[], from: PlanStage[]): Set<string> {
  const reached = new Set<string>();
  const pending = [...from];
  for (let stage = pending.pop(); stage; stage = pending.pop()) {
    if (reached.has(stage.id)) continue;
    reached.add(stage.id);
    pending.push(...followersOf(stages, stage.id));
  }
  return reached;
}

function isVerifyFull(stage: PlanStage): boolean {
  return stage.kind === "verify";
}

function verifyPathRefusals(stages: PlanStage[], refuse: Refuse) {
  for (const stage of stages) {
    const verifies = [...reachedFrom(stages, [stage])].some((id) =>
      stages.some((candidate) => candidate.id === id && isVerifyFull(candidate)),
    );
    const endsElsewhere = followersOf(stages, stage.id).length === 0 && !isVerifyFull(stage);
    if (!verifies || endsElsewhere) refuse("no-verify-path", stage.id);
  }
}

function graphRefusals(plan: WorkflowPlanFile, refuse: Refuse) {
  const { stages } = plan;
  const ids = new Set(stages.map((stage) => stage.id));
  for (const stage of stages) {
    if (stage.after.some((id) => !ids.has(id))) refuse("after-missing", stage.id);
  }
  for (const stage of stages) {
    if (reachedFrom(stages, followersOf(stages, stage.id)).has(stage.id)) refuse("cycle", stage.id);
  }
  const roots = stages.filter((stage) => stage.after.length === 0);
  const reached = reachedFrom(stages, roots);
  for (const stage of stages) if (!reached.has(stage.id)) refuse("unreachable", stage.id);
  // A discovery plan ends by returning the run to routing, so it needs no verify stage.
  if (plan.route !== "discovery") verifyPathRefusals(stages, refuse);
}

function documentOf(text: string): unknown {
  try {
    return parseYaml(text);
  } catch {
    return undefined;
  }
}

function stagesOf(document: Record<string, unknown>, refuse: Refuse): PlanStage[] | null {
  const entries = document.stages;
  if (!Array.isArray(entries) || entries.length === 0) return refused(refuse, "shape", "stages");
  const stages = entries.map((entry) => stageOf(entry, refuse));
  const ids = stages.map((stage) => stage?.id);
  for (const [index, id] of ids.entries()) {
    if (id && ids.indexOf(id) !== index) refuse("shape", id);
  }
  return stages.every((stage) => stage !== null) ? stages : null;
}

// Parse one plan file's text, refusing whatever the plan contract does not admit.
export function parsePlan(text: string, route: WorkflowRoute): PlanLoad {
  const refusals: PlanRefusal[] = [];
  const refuse: Refuse = (reason, subject) => refusals.push({ route, reason, subject });
  const document = documentOf(text);
  if (!isRecord(document)) {
    return { ok: false, refusals: [{ route, reason: "not-mapping", subject: route }] };
  }
  unknownKeys(document, PLAN_KEYS, refuse);
  if (document.route !== route) refuse("route-name", String(document.route));
  const stages = stagesOf(document, refuse);
  const plan = { route, stages: stages ?? [] };
  if (stages && refusals.length === 0) graphRefusals(plan, refuse);
  return refusals.length === 0 ? { ok: true, plan } : { ok: false, refusals };
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
async function loadBuiltInPlan(route: WorkflowRoute): Promise<WorkflowPlanFile> {
  const load = await loadPackagePlan(route);
  if (!load.ok) throw new Error(`The packaged ${route} plan does not load.`);
  return load.plan;
}

export async function loadBuiltInPlans(): Promise<Record<WorkflowRoute, WorkflowPlanFile>> {
  const [direct, bugfix, boundedChange, feature, discovery] = await Promise.all([
    loadBuiltInPlan("direct"),
    loadBuiltInPlan("bugfix"),
    loadBuiltInPlan("bounded-change"),
    loadBuiltInPlan("feature"),
    loadBuiltInPlan("discovery"),
  ]);
  return { direct, bugfix, "bounded-change": boundedChange, feature, discovery };
}

// Every step the loaded plans run, with the first route running it.
function planSteps(plans: readonly WorkflowPlanFile[]): Map<string, WorkflowRoute> {
  const steps = new Map<string, WorkflowRoute>();
  for (const plan of plans) {
    for (const step of plan.stages.flatMap((stage) => stage.steps)) {
      if (!steps.has(step.name)) steps.set(step.name, plan.route);
    }
  }
  return steps;
}

// Each step a plan runs that is not installed: `<assistant>/step/<name>/STEP.md` is no file.
async function contractRefusals(
  root: string,
  steps: Map<string, WorkflowRoute>,
): Promise<PlanRefusal[]> {
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
  steps: Map<string, WorkflowRoute>,
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
