// `npx qfai workflow plan`: the route an extraction or a route name gives, with its stages, steps
// and decision, release and branch points. It starts nothing and writes nothing.

import type { Artifact } from "./extraction.js";
import { extractionFaultsOf, isExtraction } from "./extractionShape.js";
import {
  loadInstalledPlan,
  type PlanBranchPoint,
  type PlanRefusal,
  type WorkflowPlanFile,
} from "./plans.js";
import { routingOutcome, type RouteCandidate } from "./routeDecision.js";
import { isWorkflowRoute, type WorkflowRoute } from "./routes.js";
import { firstWritingStep, scopesOf, unservedArtifacts, type PlanScope } from "./scopes.js";
import { stepPath } from "./steps.js";

export type PlanReason =
  "invalid-input" | "schema" | "unknown-route" | "plan-invalid" | "artifact-unserved" | "io-error";

export interface PlanReasonEntry {
  reason: PlanReason;
  subject: string;
  // For `plan-invalid`: the plan file and why it does not load. For `schema`: how the field
  // departs from the extraction's shape.
  file?: string;
  cause?: string;
}

export interface PlannedStep {
  name: string;
  path: string;
  mode: string | null;
  passThrough: boolean;
}

// One pass of an implement stage's steps over one business flow.
export interface WorkOrder {
  target: string;
}

export interface PlannedStage {
  id: string;
  kind: string;
  review?: "spec" | "code";
  steps: PlannedStep[];
  // Present on an implement stage when the extraction declares its flows.
  workOrders?: WorkOrder[];
}

export interface PlanCandidate {
  route: WorkflowRoute;
  family: string;
  rule: number | null;
  summary: string;
  recommended: boolean;
  scopes: PlanScope[];
  decisionPoints: string[];
}

export type PlanDocument =
  | {
      ok: true;
      route: string;
      family: string;
      rule?: number | null;
      stages: PlannedStage[];
      decisionPoints: string[];
      releasePoint: string | null;
      branchPoints: PlanBranchPoint[];
      // Present when an extraction gave the plan.
      scopes?: PlanScope[];
    }
  | { ok: true; candidates: PlanCandidate[] }
  | { ok: false; message: string; reasons: PlanReasonEntry[] };

export type PlanInput = { extraction: unknown } | { route: string };

const FAMILY_SUMMARIES: Record<string, string> = {
  close: "Close the request without a change.",
  decide: "Settle the decision before any change.",
  consistency: "Make the declared surfaces agree.",
  change: "Change the product's behaviour.",
  fix: "Fix the defect.",
  upkeep: "Repair tests, CI or dependencies, or remove authorized temporary directories.",
  release: "Prepare the release or the operation.",
};

export function refusal(message: string, reasons: PlanReasonEntry[]): PlanDocument {
  return { ok: false, message, reasons };
}

// An implement stage runs once per declared flow, in ascending ID order.
function workOrdersOf(kind: string, flows: readonly string[] | undefined) {
  if (kind !== "implement" || flows === undefined) return {};
  return { workOrders: [...flows].sort().map((target) => ({ target })) };
}

export function planned(
  plan: WorkflowPlanFile,
  rule?: number | null,
  scopes?: PlanScope[],
  flows?: readonly string[],
): PlanDocument {
  return {
    ok: true,
    route: plan.route,
    family: plan.family,
    ...(rule === undefined ? {} : { rule }),
    stages: plan.stages.map((stage) => ({
      id: stage.id,
      kind: stage.kind,
      ...(stage.review === "spec" || stage.review === "code" ? { review: stage.review } : {}),
      steps: stage.steps.map((step) => ({
        name: step.name,
        path: stepPath(step.name),
        mode: step.mode ?? null,
        passThrough: step.passThrough ?? false,
      })),
      ...workOrdersOf(stage.kind, flows),
    })),
    decisionPoints: plan.decisionPoints,
    // Where nothing after it may run without the user's approval: a step, `end`, or none.
    releasePoint: plan.releasePoint ?? null,
    branchPoints: plan.branchPoints,
    ...(scopes === undefined ? {} : { scopes }),
  };
}

type Loaded = { ok: true; plan: WorkflowPlanFile } | { ok: false; document: PlanDocument };

function planInvalid(refusals: readonly PlanRefusal[]): PlanDocument {
  const reasons = refusals.map((each) => ({
    reason: "plan-invalid" as const,
    // A refusal about an empty key or name has no subject of its own: name the plan file.
    subject: each.subject || `${each.route}.yml`,
    file: `${each.route}.yml`,
    cause: each.reason,
  }));
  const message =
    "A plan the package ships does not load in this project, so reinstall qfai or rerun its init with --force to restore the missing steps.";
  return refusal(message, reasons);
}

async function loaded(root: string, route: WorkflowRoute): Promise<Loaded> {
  const load = await loadInstalledPlan(root, route);
  return load.ok ? load : { ok: false, document: planInvalid(load.refusals) };
}

// The refusal for a request whose artifacts no stage of the route writes.
function unservedRefusal(unserved: readonly Artifact[]): PlanDocument {
  const message =
    "No stage of the route writes an artifact the request names, so the work stops before the first stage: ask for work the route does.";
  return refusal(
    message,
    unserved.map((subject) => ({ reason: "artifact-unserved" as const, subject })),
  );
}

// The `decision` flag says the work cannot start until someone chooses. A plan that names no
// decision point then takes the first step that writes as one, so the choice is put to the user
// before anything changes; the route itself stays as it is.
function decisionPointsOf(plan: WorkflowPlanFile, flagged: boolean): string[] {
  if (plan.decisionPoints.length > 0 || !flagged) return plan.decisionPoints;
  const step = firstWritingStep(plan.stages, plan.family);
  return step === undefined ? [] : [step];
}

async function candidatesOf(
  root: string,
  choices: readonly RouteCandidate[],
  recommended: WorkflowRoute,
  artifacts: readonly Artifact[],
): Promise<PlanDocument> {
  const candidates: PlanCandidate[] = [];
  for (const choice of choices) {
    const load = await loaded(root, choice.route);
    if (!load.ok) return load.document;
    const { family, stages } = load.plan;
    // A candidate that cannot serve the request is not an option.
    if (unservedArtifacts(stages, artifacts).length > 0) continue;
    const decisionPoints = decisionPointsOf(load.plan, choice.decision);
    const summary = `${FAMILY_SUMMARIES[family] ?? "Run this plan."} Stages: ${stages.map((stage) => stage.id).join(", ")}.`;
    candidates.push({
      route: choice.route,
      family,
      rule: choice.rule,
      summary,
      recommended: choice.route === recommended,
      scopes: scopesOf(stages, artifacts, choice.restyle),
      decisionPoints,
    });
  }
  if (candidates.length === 0) return unservedRefusal(artifacts);
  // The recommended candidate may have been left out: the first one left is then recommended.
  const first = !candidates.some((candidate) => candidate.recommended);
  return {
    ok: true,
    candidates: candidates.map((candidate, index) => ({
      ...candidate,
      recommended: first ? index === 0 : candidate.recommended,
    })),
  };
}

async function planOfExtraction(root: string, extraction: unknown): Promise<PlanDocument> {
  if (!isExtraction(extraction)) {
    const message =
      "The extraction does not match its schema, so fix each named field as its cause says.";
    return refusal(
      message,
      extractionFaultsOf(extraction).map(({ subject, cause }) => ({
        reason: "schema",
        subject,
        cause,
      })),
    );
  }
  const outcome = routingOutcome(extraction);
  const { artifacts } = extraction;
  if ("candidates" in outcome) {
    return candidatesOf(root, outcome.candidates, outcome.recommended, artifacts);
  }
  const load = await loaded(root, outcome.taken.route);
  if (!load.ok) return load.document;
  const unserved = unservedArtifacts(load.plan.stages, artifacts);
  if (unserved.length > 0) return unservedRefusal(unserved);
  const decisionPoints = decisionPointsOf(load.plan, extraction.entryFlags.includes("decision"));
  return planned(
    { ...load.plan, decisionPoints },
    outcome.taken.rule,
    scopesOf(load.plan.stages, artifacts, extraction.qualifiers.includes("restyle")),
    extraction.flows,
  );
}

// The plan of an extraction or of a named route, the candidates of a low-confidence extraction,
// or the refusal.
export async function planOf(root: string, input: PlanInput): Promise<PlanDocument> {
  if ("extraction" in input) return planOfExtraction(root, input.extraction);
  if (!isWorkflowRoute(input.route)) {
    const message = "No route has that name, so name a route of the catalog.";
    return refusal(message, [{ reason: "unknown-route", subject: input.route || "--route" }]);
  }
  const load = await loaded(root, input.route);
  return load.ok ? planned(load.plan) : load.document;
}
