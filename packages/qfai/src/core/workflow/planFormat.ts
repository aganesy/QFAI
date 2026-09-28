import { parse as parseYaml } from "yaml";

import { isModifier } from "./modifiers.js";
import { isRecord } from "./parse.js";
import { isWorkflowRoute, ROUTE_FAMILIES } from "./routes.js";
import { SEAM_STEP } from "./steps.js";
import type { PlanStep } from "./types.js";

export interface PlanStage {
  id: string;
  kind: string;
  steps: PlanStep[];
  after: string[];
  effects: string[];
}

// A step at which the run may change route, and where each outcome it reports sends the run:
// to one of the routes named, or to the route the decision rules give.
export interface PlanBranchPoint {
  step: string;
  outcomes: { outcome: string; routes: string[] | "decision-table" }[];
}

export interface WorkflowPlanFile {
  route: string;
  family: string;
  stages: PlanStage[];
  defaultModifiers: string[];
  decisionPoints: string[];
  releasePoint?: string;
  branchPoints: PlanBranchPoint[];
}

export type PlanRefusalReason =
  | "file-missing"
  | "not-mapping"
  | "unknown-key"
  | "route-name"
  | "family"
  | "shape"
  | "effects"
  | "out-of-vocabulary"
  | "kind-mismatch"
  | "mode"
  | "pass-through"
  | "seam"
  | "after-missing"
  | "cycle"
  | "unreachable"
  | "point"
  | "destination"
  | "no-verify-path"
  | "terminal"
  | "step-missing"
  | "reviewer-missing";

// Why a plan was refused, and the key, stage, step or route the refusal is about.
export interface PlanRefusal {
  route: string;
  reason: PlanRefusalReason;
  subject: string;
}

export type PlanLoad =
  { ok: true; plan: WorkflowPlanFile } | { ok: false; refusals: PlanRefusal[] };

const PLAN_KEYS = [
  "route",
  "family",
  "stages",
  "defaultModifiers",
  "decisionPoints",
  "releasePoint",
  "branchPoints",
];
const STAGE_KEYS = ["id", "kind", "steps", "after", "effects"];
const STEP_KEYS = ["step", "mode", "passThrough"];
const BRANCH_KEYS = ["step", "outcomes"];
const OUTCOME_KEYS = ["outcome", "routes"];

// Each step mode, with the one step it may sit on.
const MODES: Record<string, string> = { settled: "sdd-triage", "read-only": "implement-diagnose" };

const SDD_APPEND = ["sdd-story", "sdd-gate"];

const VERIFY_BLOCK = [
  "verify-change-note",
  "verify-context",
  "verify-qfai-gate",
  "verify-repo-gate",
];

// Each stage kind, with the steps a stage of that kind may run.
const KINDS: Record<string, string[]> = {
  triage: [
    "triage-close",
    "triage-answer",
    "triage-investigate",
    "triage-request-info",
    "triage-dedupe",
    "triage-decompose",
    "triage-cluster",
    "triage-security-intake",
    "triage-handoff",
  ],
  discussion: [
    "discussion-research",
    "discussion-interview",
    "discussion-pack",
    "discussion-oq",
    "discussion-uiux",
  ],
  diagnose: ["implement-diagnose", "implement-bisect", "implement-minimize", "implement-benchmark"],
  sdd: [
    "sdd-triage",
    "sdd-flow",
    "sdd-story",
    "sdd-contract",
    "common-design-md",
    "sdd-cycle",
    "sdd-gate",
  ],
  sdd_append: SDD_APPEND,
  prototype: [
    "prototyping-grill",
    "prototyping-preflight",
    "prototyping-loop",
    "prototyping-handoff",
  ],
  acceptance: ["atdd-scaffold", "atdd-credentials", "atdd-author"],
  test_fix: ["atdd-test-fix", "implement-test-fix"],
  regression_fix: ["implement-regression-fix"],
  maintenance: ["maintain-edit"],
  verify: [
    ...VERIFY_BLOCK,
    "verify-repeat-run",
    "verify-advisory",
    "verify-external",
    "verify-manual",
    "verify-release-notes",
  ],
  implement: [
    "implement-tdd",
    "implement-checkpoint",
    "implement-refactor",
    "implement-retire",
    "implement-sweep",
    "implement-quarantine",
    "implement-dep-bump",
    "implement-tooling",
    "implement-backport",
    "implement-revert",
    "implement-stress-harness",
    "implement-oracle-parity",
  ],
};

// `implement-seam` is a step of the vocabulary that no plan stage may run.
const STEPS = new Set([...Object.values(KINDS).flat(), SEAM_STEP]);

// The steps a plan may mark pass-through: each runs, and passes with evidence when it can show
// it has nothing to write.
export const PASS_THROUGH_STEPS = [
  "sdd-flow",
  "sdd-contract",
  "sdd-cycle",
  "sdd-story",
  "common-design-md",
  "atdd-credentials",
  "atdd-author",
  "discussion-uiux",
  "atdd-test-fix",
  "implement-test-fix",
  "maintain-edit",
  "verify-change-note",
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

function namesOf(stage: PlanStage): string[] {
  return stage.steps.map((step) => step.name);
}

// Whether the stage's steps are those of its kind: an `sdd_append` stage runs exactly its two
// steps, and a stage of just those two steps is an `sdd_append` stage.
function kindHolds(stage: PlanStage, kind: string[]): boolean {
  const names = namesOf(stage);
  const appendShape = names.join(",") === SDD_APPEND.join(",");
  if (stage.kind === "sdd_append" || appendShape) return stage.kind === "sdd_append" && appendShape;
  return names.every((name) => kind.includes(name));
}

function vocabularyRefusals(stage: PlanStage, refuse: Refuse) {
  const kind = KINDS[stage.kind];
  const names = namesOf(stage);
  const outside = [...(kind ? [] : [stage.kind]), ...names.filter((name) => !STEPS.has(name))];
  for (const name of outside) refuse("out-of-vocabulary", name);
  for (const step of stage.steps) {
    if (step.passThrough && !PASS_THROUGH_STEPS.includes(step.name)) {
      refuse("pass-through", step.name);
    }
    if (step.mode !== undefined && MODES[step.mode] !== step.name) refuse("mode", step.name);
  }
  if (names.includes(SEAM_STEP)) refuse("seam", stage.id);
  else if (outside.length === 0 && kind && !kindHolds(stage, kind)) {
    refuse("kind-mismatch", stage.id);
  }
}

// One step entry: a step name, or `{ step, mode, passThrough }`.
function stepOf(value: unknown, refuse: Refuse): PlanStep | null {
  if (typeof value === "string") return { name: value };
  if (!isRecord(value)) return null;
  unknownKeys(value, STEP_KEYS, refuse);
  const { step, mode, passThrough } = value;
  if (typeof step !== "string") return null;
  if (mode !== undefined && !(typeof mode === "string" && Object.hasOwn(MODES, mode))) {
    return refused(refuse, "out-of-vocabulary", typeof mode === "string" ? mode : "mode");
  }
  if (passThrough !== undefined && typeof passThrough !== "boolean") return null;
  return {
    name: step,
    ...(passThrough ? { passThrough } : {}),
    ...(typeof mode === "string" ? { mode } : {}),
  };
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
  const { id, kind } = value;
  const steps = stepsOf(value.steps, refuse);
  const after = value.after === undefined ? [] : stringList(value.after);
  const effects = value.effects === undefined ? [] : stringList(value.effects);
  if (!effects || effects.some((effect) => !EFFECTS.includes(effect))) {
    refuse("effects", typeof id === "string" ? id : "stages");
  }
  if (typeof id !== "string" || typeof kind !== "string" || !steps || !after) {
    return refused(refuse, "shape", typeof id === "string" ? id : "stages");
  }
  if (!effects) return refused(refuse, "shape", id);
  const stage = { id, kind, steps, after, effects };
  vocabularyRefusals(stage, refuse);
  return stage;
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

function graphRefusals(stages: PlanStage[], refuse: Refuse) {
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
}

function runs(stage: PlanStage, step: string): boolean {
  return namesOf(stage).includes(step);
}

// A change route runs the verify block as one stage, which every other stage reaches and which
// only a stage running `verify-external` follows.
function verifyBlockRefusals(stages: PlanStage[], refuse: Refuse) {
  const blocks = stages.filter((stage) => runs(stage, "verify-repo-gate"));
  const [block] = blocks;
  if (!block) return;
  if (blocks.length > 1 || namesOf(block).join(",") !== VERIFY_BLOCK.join(",")) {
    refuse("terminal", block.id);
    return;
  }
  const after = followersOf(stages, block.id);
  const [external] = after;
  const externalOnly =
    external !== undefined &&
    after.length === 1 &&
    namesOf(external).join(",") === "verify-external" &&
    followersOf(stages, external.id).length === 0;
  if (after.length > 0 && !externalOnly) refuse("terminal", block.id);
  for (const stage of stages) {
    if (stage === block || (externalOnly && stage === external)) continue;
    if (!reachedFrom(stages, [stage]).has(block.id)) refuse("no-verify-path", stage.id);
  }
}

// A route with no verify block ends at one stage running `triage-close`, or is the one stage
// that drafts release notes.
function terminalRefusals(stages: PlanStage[], refuse: Refuse) {
  if (stages.some((stage) => runs(stage, "verify-repo-gate"))) {
    verifyBlockRefusals(stages, refuse);
    return;
  }
  const [only] = stages;
  if (stages.length === 1 && only && namesOf(only).join(",") === "verify-release-notes") return;
  const ends = stages.filter((stage) => followersOf(stages, stage.id).length === 0);
  const [end] = ends;
  if (ends.length !== 1 || !end || !runs(end, "triage-close")) {
    refuse("terminal", ends.map((stage) => stage.id).join(",") || "stages");
  }
}

function modifiersOf(value: unknown, refuse: Refuse): string[] {
  const modifiers = stringList(value);
  if (!modifiers) {
    refuse("shape", "defaultModifiers");
    return [];
  }
  for (const modifier of modifiers) {
    if (!isModifier(modifier)) refuse("out-of-vocabulary", modifier);
  }
  return modifiers;
}

function outcomeOf(value: unknown, refuse: Refuse): PlanBranchPoint["outcomes"][number] | null {
  if (!isRecord(value)) return null;
  unknownKeys(value, OUTCOME_KEYS, refuse);
  const { outcome, routes } = value;
  if (typeof outcome !== "string" || outcome === "") return null;
  if (routes === "decision-table") return { outcome, routes };
  const named = stringList(routes);
  if (!named || named.length === 0) return null;
  for (const route of named) if (!isWorkflowRoute(route)) refuse("destination", route);
  return { outcome, routes: named };
}

function branchPointOf(value: unknown, refuse: Refuse): PlanBranchPoint | null {
  if (!isRecord(value)) return refused(refuse, "shape", "branchPoints");
  unknownKeys(value, BRANCH_KEYS, refuse);
  const { step, outcomes } = value;
  if (typeof step !== "string" || !Array.isArray(outcomes) || outcomes.length === 0) {
    return refused(refuse, "shape", "branchPoints");
  }
  const parsed = outcomes.map((outcome) => outcomeOf(outcome, refuse));
  if (!parsed.every((outcome) => outcome !== null)) return refused(refuse, "shape", step);
  return { step, outcomes: parsed };
}

function branchPointsOf(value: unknown, refuse: Refuse): PlanBranchPoint[] {
  if (!Array.isArray(value)) {
    refuse("shape", "branchPoints");
    return [];
  }
  return value.flatMap((entry) => branchPointOf(entry, refuse) ?? []);
}

// Each decision, release and branch point names a step the plan runs exactly once.
function pointRefusals(plan: WorkflowPlanFile, refuse: Refuse) {
  const names = plan.stages.flatMap(namesOf);
  const points = [
    ...plan.decisionPoints,
    ...(plan.releasePoint === undefined ? [] : [plan.releasePoint]),
    ...plan.branchPoints.map((point) => point.step),
  ];
  for (const point of points) {
    if (names.filter((name) => name === point).length !== 1) refuse("point", point);
  }
}

function documentOf(text: string): unknown {
  try {
    return parseYaml(text);
  } catch {
    return undefined;
  }
}

// The plan's route, family and points, read from the document.
function headerOf(document: Record<string, unknown>, route: string, refuse: Refuse) {
  if (document.route !== route || !isWorkflowRoute(route)) {
    refuse("route-name", String(document.route));
  }
  const family = typeof document.family === "string" ? document.family : "";
  if (!ROUTE_FAMILIES.some((each) => each === family)) refuse("family", family || "family");
  const decisionPoints = stringList(document.decisionPoints);
  if (!decisionPoints) refuse("shape", "decisionPoints");
  const { releasePoint } = document;
  if (releasePoint !== undefined && typeof releasePoint !== "string") {
    refuse("shape", "releasePoint");
  }
  return {
    family,
    defaultModifiers: modifiersOf(document.defaultModifiers, refuse),
    decisionPoints: decisionPoints ?? [],
    ...(typeof releasePoint === "string" ? { releasePoint } : {}),
    branchPoints: branchPointsOf(document.branchPoints, refuse),
  };
}

// The graph, then the points and the ending, each checked only once what it reads holds.
function shapeRefusals(plan: WorkflowPlanFile, refuse: Refuse) {
  const found: PlanRefusalReason[] = [];
  const counted: Refuse = (reason, subject) => {
    found.push(reason);
    refuse(reason, subject);
  };
  graphRefusals(plan.stages, counted);
  if (found.length === 0) pointRefusals(plan, counted);
  if (found.length === 0) terminalRefusals(plan.stages, counted);
}

// Parse one plan file's text, refusing whatever the plan format does not admit.
export function parsePlan(text: string, route: string): PlanLoad {
  const refusals: PlanRefusal[] = [];
  const refuse: Refuse = (reason, subject) => refusals.push({ route, reason, subject });
  const document = documentOf(text);
  if (!isRecord(document)) {
    return { ok: false, refusals: [{ route, reason: "not-mapping", subject: route }] };
  }
  unknownKeys(document, PLAN_KEYS, refuse);
  const header = headerOf(document, route, refuse);
  const stages = stagesOf(document, refuse);
  const plan: WorkflowPlanFile = { route, ...header, stages: stages ?? [] };
  if (stages && refusals.length === 0) shapeRefusals(plan, refuse);
  return refusals.length === 0 ? { ok: true, plan } : { ok: false, refusals };
}
