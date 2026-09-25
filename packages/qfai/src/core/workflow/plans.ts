import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { getInitAssetsDir } from "../../shared/assets.js";
import { normalizeNewlines } from "../../shared/text.js";
import type { QfaiConfig } from "../config.js";
import { joinAssistantLayer } from "../paths/assistantPaths.js";
import { readEffectiveRouting } from "../validators/agentDefinition.js";
import type { SkillRouting } from "../validators/skillRoles.js";
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
  | "skill-missing"
  | "operations-table-missing"
  | "operations-first-column"
  | "operations-cell-not-id"
  | "operations-pair-omitted"
  | "reviewer-missing";

// Why a plan was refused, and the key, stage or route the refusal is about.
export interface PlanRefusal {
  route: WorkflowRoute;
  reason: PlanRefusalReason;
  subject: string;
}

export type PlanLoad =
  { ok: true; plan: WorkflowPlanFile } | { ok: false; refusals: PlanRefusal[] };

// The verdict over the package's plans, the skills they name and the reviewers the effective
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
const STAGE_KEYS = ["id", "kind", "skill", "operation", "when", "after", "effects"];

// Each stage kind, with its skills and its operation.
const KINDS: Record<string, { skills: string[]; operation: string }> = {
  maintenance: { skills: ["qfai-maintain"], operation: "non-normative-edit" },
  diagnose: { skills: ["qfai-implement"], operation: "diagnose-only" },
  sdd_append: { skills: ["qfai-sdd"], operation: "defect-example-seeding" },
  test_fix: { skills: ["qfai-atdd", "qfai-implement"], operation: "test-fix" },
  regression_fix: { skills: ["qfai-implement"], operation: "regression-fix" },
  sdd: { skills: ["qfai-sdd"], operation: "new-story" },
  sdd_delta: { skills: ["qfai-sdd"], operation: "update-or-applicability-check" },
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
  "missing_example_needed",
  "diagnosis_missing_test",
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

type PlanUse = { route: WorkflowRoute; operations: Set<string> };

// Every (skill, operation) pair the loaded plans use, with the first route using the skill.
function planPairs(plans: readonly WorkflowPlanFile[]): Map<string, PlanUse> {
  const pairs = new Map<string, PlanUse>();
  for (const plan of plans) {
    for (const stage of plan.stages) {
      for (const skill of stage.skills) {
        const entry = pairs.get(skill) ?? { route: plan.route, operations: new Set<string>() };
        pairs.set(skill, entry);
        entry.operations.add(stage.operation);
      }
    }
  }
  return pairs;
}

type TableRead = { ok: true; operations: string[] } | { ok: false; reason: PlanRefusalReason };

// The lines of the first table under `## Operations`, up to the next heading, outside fences.
function operationsTableLines(text: string): string[] {
  const table: string[] = [];
  let inside = false;
  let fenced = false;
  for (const line of normalizeNewlines(text).split("\n")) {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    if (fenced) continue;
    if (/^#{1,6}\s/.test(line)) {
      if (inside) break;
      inside = line.trimEnd() === "## Operations";
      continue;
    }
    if (!inside) continue;
    if (line.trimStart().startsWith("|")) table.push(line.trim());
    else if (table.length > 0) break;
  }
  return table;
}

function cellsOf(row: string): string[] {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

// The operations a skill's Operations table declares: a first column headed `Operation`, each
// cell exactly one backticked operation ID of the vocabulary.
export function readOperationsTable(text: string): TableRead {
  const [header, , ...rows] = operationsTableLines(text);
  if (header === undefined) return { ok: false, reason: "operations-table-missing" };
  if (cellsOf(header)[0] !== "Operation") return { ok: false, reason: "operations-first-column" };
  const operations: string[] = [];
  for (const row of rows) {
    const id = /^`([a-z-]+)`$/.exec(cellsOf(row)[0] ?? "")?.[1];
    if (id === undefined || !OPERATIONS.has(id)) {
      return { ok: false, reason: "operations-cell-not-id" };
    }
    operations.push(id);
  }
  return { ok: true, operations };
}

// A skill a plan names must be installed, and its Operations table must declare every
// operation the plans use it for.
async function skillRefusals(root: string, skill: string, use: PlanUse): Promise<PlanRefusal[]> {
  const refusal = (reason: PlanRefusalReason, subject = skill) => [
    { route: use.route, reason, subject },
  ];
  const skillDir = joinAssistantLayer(root, "skill", skill);
  if (!(await stat(skillDir).catch(() => undefined))?.isDirectory()) {
    return refusal("skill-missing");
  }
  const text = await readIfPresent(path.join(skillDir, "references", "orchestrated-mode.md"));
  const table = readOperationsTable(text ?? "");
  if (!table.ok) return refusal(table.reason);
  return [...use.operations]
    .filter((operation) => !table.operations.includes(operation))
    .flatMap((operation) => refusal("operations-pair-omitted", `${skill}:${operation}`));
}

function requiredAgents(routing: Map<string, SkillRouting> | undefined, skill: string): string[] {
  const agents = routing?.get(skill)?.agents ?? new Map<string, string>();
  return [...agents].filter(([, binding]) => binding === "required").map(([agent]) => agent);
}

// Every agent the package's default routing requires for a skill a plan dispatches must still be
// required by the effective routing. An agent the project adds is the project's.
async function reviewerRefusals(
  config: Pick<QfaiConfig, "routing" | "reviewProfiles">,
  pairs: Map<string, PlanUse>,
): Promise<PlanRefusal[]> {
  const { routing, defaultRouting } = await readEffectiveRouting(config);
  const refusals: PlanRefusal[] = [];
  for (const [skill, { route }] of pairs) {
    const kept = requiredAgents(routing, skill);
    for (const agent of requiredAgents(defaultRouting, skill)) {
      if (!kept.includes(agent)) {
        refusals.push({ route, reason: "reviewer-missing", subject: `${skill}:${agent}` });
      }
    }
  }
  return refusals;
}

// Trigger (b) over the package's plans and the skills they name, then trigger (c) over the
// reviewers the effective routing keeps. The first that holds is the cause.
export async function checkPlans(
  projectRoot: string,
  config: Pick<QfaiConfig, "routing" | "reviewProfiles">,
): Promise<PlanCheck> {
  const loaded = await Promise.all(WORKFLOW_ROUTES.map((route) => loadPackagePlan(route)));
  const loadRefusals = loaded.flatMap((load) => (load.ok ? [] : load.refusals));
  if (loadRefusals.length > 0) return { cause: "contract-undeclared", refusals: loadRefusals };
  const pairs = planPairs(loaded.flatMap((load) => (load.ok ? [load.plan] : [])));
  const contract = (
    await Promise.all([...pairs].map(([skill, use]) => skillRefusals(projectRoot, skill, use)))
  ).flat();
  if (contract.length > 0) return { cause: "contract-undeclared", refusals: contract };
  const reviewers = await reviewerRefusals(config, pairs);
  return reviewers.length > 0
    ? { cause: "reviewer-missing", refusals: reviewers }
    : { refusals: [] };
}
