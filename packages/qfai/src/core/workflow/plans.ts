import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { getInitAssetsDir } from "../../shared/assets.js";
import { normalizeNewlines } from "../../shared/text.js";
import { isRecord } from "./parse.js";

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
  // One skill, or both of a `test_fix` stage's.
  skills: string[];
  operation: string;
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
  | "plan-differs";

// Why a plan was refused, and the key, stage or route the refusal is about.
export interface PlanRefusal {
  route: WorkflowRoute;
  reason: PlanRefusalReason;
  subject: string;
}

export type PlanLoad =
  { ok: true; plan: WorkflowPlanFile } | { ok: false; refusals: PlanRefusal[] };

// The verdict over a project's installed plans: a refusal is the cause `contract-undeclared`.
export interface PlanCheck {
  cause?: "contract-undeclared";
  refusals: PlanRefusal[];
}

// Where the plans sit, relative to the package's `assets/init` and to a project root.
export const PLANS_DIR = path.join(".qfai", "assistant", "process", "workflows");

const PLAN_KEYS = ["route", "stages"];
const STAGE_KEYS = ["id", "kind", "skill", "operation", "when", "after", "effects"];

// Each stage kind, with its skills and its operation.
const KINDS: Record<string, { skills: string[]; operation: string }> = {
  maintenance: { skills: ["qfai-maintain"], operation: "non-normative-edit" },
  diagnose: { skills: ["qfai-implement"], operation: "diagnose-only" },
  sdd_append: { skills: ["qfai-sdd"], operation: "defect-row-seeding" },
  test_fix: { skills: ["qfai-atdd", "qfai-implement"], operation: "test-fix" },
  regression_fix: { skills: ["qfai-implement"], operation: "regression-fix" },
  sdd: { skills: ["qfai-sdd"], operation: "new-capability" },
  sdd_delta: { skills: ["qfai-sdd"], operation: "delta-or-applicability-check" },
  prototype: { skills: ["qfai-prototyping"], operation: "existing-runtime-contract" },
  acceptance: { skills: ["qfai-atdd"], operation: "author-acceptance-tests" },
  implement: { skills: ["qfai-implement"], operation: "implement" },
  verify: { skills: ["qfai-verify"], operation: "verify-full" },
  discussion: { skills: ["qfai-discussion"], operation: "resolve-unsettled-product-scope" },
};

const SKILLS = new Set(Object.values(KINDS).flatMap((kind) => kind.skills));
// `seam-only` is an operation of the vocabulary that no plan stage may carry.
const OPERATIONS = new Set([...Object.values(KINDS).map((kind) => kind.operation), "seam-only"]);

const PREDICATES = [
  "always",
  "missing_test_row_needed",
  "test_defect_found",
  "regression_found",
  "acceptance_obligations_unmet",
  "prototype_decision_needed",
  "full_discussion_needed",
];

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

function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function vocabularyRefusals(stage: PlanStage, refuse: Refuse) {
  const kind = KINDS[stage.kind];
  const outside = [
    ...(kind ? [] : [stage.kind]),
    ...stage.skills.filter((skill) => !SKILLS.has(skill)),
    ...(OPERATIONS.has(stage.operation) ? [] : [stage.operation]),
    ...(PREDICATES.includes(stage.when) ? [] : [stage.when]),
  ];
  for (const name of outside) refuse("out-of-vocabulary", name);
  if (outside.length > 0 || !kind) return;
  if (!sameSet(stage.skills, kind.skills) || stage.operation !== kind.operation) {
    refuse("kind-mismatch", stage.id);
  }
}

// One stage entry, or null when its shape is refused.
function stageOf(value: unknown, refuse: Refuse): PlanStage | null {
  if (!isRecord(value)) return refused(refuse, "shape", "stages");
  unknownKeys(value, STAGE_KEYS, refuse);
  const { id, kind, skill, operation, when } = value;
  const skills = typeof skill === "string" ? [skill] : stringList(skill);
  const after = value.after === undefined ? [] : stringList(value.after);
  const effects = value.effects === undefined ? [] : stringList(value.effects);
  if (!effects || effects.some((effect) => !EFFECTS.includes(effect))) {
    refuse("effects", typeof id === "string" ? id : "stages");
  }
  if (typeof id !== "string" || typeof kind !== "string" || !skills?.length || !after) {
    return refused(refuse, "shape", typeof id === "string" ? id : "stages");
  }
  if (typeof operation !== "string" || typeof when !== "string" || !effects) {
    return refused(refuse, "shape", id);
  }
  const stage = { id, kind, skills, operation, when, after, effects };
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
  return stage.kind === "verify" && stage.operation === "verify-full";
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
  if (plan.route === "discovery") return;
  for (const stage of stages) {
    const verifies = [...reachedFrom(stages, [stage])].some((id) =>
      stages.some((candidate) => candidate.id === id && isVerifyFull(candidate)),
    );
    const endsElsewhere = followersOf(stages, stage.id).length === 0 && !isVerifyFull(stage);
    if (!verifies || endsElsewhere) refuse("no-verify-path", stage.id);
  }
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
  if (!isRecord(document))
    return { ok: false, refusals: [{ route, reason: "not-mapping", subject: route }] };
  unknownKeys(document, PLAN_KEYS, refuse);
  if (document.route !== route) refuse("route-name", String(document.route));
  const stages = stagesOf(document, refuse);
  const plan = { route, stages: stages ?? [] };
  if (stages && refusals.length === 0) graphRefusals(plan, refuse);
  return refusals.length === 0 ? { ok: true, plan } : { ok: false, refusals };
}

function packagePlanPath(route: WorkflowRoute): string {
  return path.join(getInitAssetsDir(), PLANS_DIR, `${route}.yml`);
}

// A package copy that does not load is a packaging defect, so it throws.
async function loadBuiltInPlan(route: WorkflowRoute): Promise<WorkflowPlanFile> {
  const loaded = parsePlan(await readFile(packagePlanPath(route), "utf8"), route);
  if (!loaded.ok) throw new Error(`The packaged ${route} plan does not load.`);
  return loaded.plan;
}

// The package's own plans, which are the ones a run follows.
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

async function readIfPresent(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

// One installed copy against the package's: it must load and equal it after CRLF normalization.
async function installedPlanRefusals(root: string, route: WorkflowRoute): Promise<PlanRefusal[]> {
  const installed = await readIfPresent(path.join(root, PLANS_DIR, `${route}.yml`));
  if (installed === undefined) return [{ route, reason: "file-missing", subject: route }];
  const loaded = parsePlan(installed, route);
  if (!loaded.ok) return loaded.refusals;
  const packaged = await readFile(packagePlanPath(route), "utf8");
  if (normalizeNewlines(installed) === normalizeNewlines(packaged)) return [];
  return [{ route, reason: "plan-differs", subject: route }];
}

// SIMPLIFIED: reads the installed plans only; neither the skills a plan names nor their
// Operations tables are read, and no reviewer the routing manifest requires is checked.
// Lift when: the start rows for a missing skill, an Operations table and a dropped reviewer land.
export async function checkInstalledPlans(projectRoot: string): Promise<PlanCheck> {
  const refusals = (
    await Promise.all(WORKFLOW_ROUTES.map((route) => installedPlanRefusals(projectRoot, route)))
  ).flat();
  return refusals.length > 0 ? { cause: "contract-undeclared", refusals } : { refusals };
}
