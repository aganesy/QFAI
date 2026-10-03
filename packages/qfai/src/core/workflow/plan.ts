// `npx qfai workflow plan`: the route an extraction or a route name gives, with its stages, steps
// and decision, release and branch points. It starts nothing and writes nothing.

import type { RouteChoice } from "./decisionRules.js";
import { extractionFaults, isExtraction } from "./extractionShape.js";
import {
  loadInstalledPlan,
  type PlanBranchPoint,
  type PlanRefusal,
  type WorkflowPlanFile,
} from "./plans.js";
import { routeDefaults, routingOutcome } from "./routeDecision.js";
import { isWorkflowRoute, type WorkflowRoute } from "./routes.js";
import { stepPath } from "./steps.js";

export type PlanReason = "invalid-input" | "schema" | "unknown-route" | "plan-invalid" | "io-error";

export interface PlanReasonEntry {
  reason: PlanReason;
  subject: string;
  // For `plan-invalid`: the plan file and why it does not load.
  file?: string;
  cause?: string;
}

export interface PlannedStep {
  name: string;
  path: string;
  mode: string | null;
  passThrough: boolean;
}

export interface PlannedStage {
  id: string;
  kind: string;
  review?: "spec" | "code";
  steps: PlannedStep[];
}

export interface PlanCandidate {
  route: WorkflowRoute;
  family: string;
  rule: number | null;
  summary: string;
  recommended: boolean;
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
  upkeep: "Repair tests, CI or dependencies.",
  release: "Prepare the release or the operation.",
};

export function refusal(message: string, reasons: PlanReasonEntry[]): PlanDocument {
  return { ok: false, message, reasons };
}

// Where nothing after the release point may run without the user's approval. A plan that names
// no release point and carries `gate:release` releases at its end.
function releasePointOf(plan: WorkflowPlanFile): string | null {
  if (plan.releasePoint !== undefined) return plan.releasePoint;
  return plan.defaultModifiers.includes("gate:release") ? "end" : null;
}

export function planned(plan: WorkflowPlanFile, rule?: number | null): PlanDocument {
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
    })),
    decisionPoints: plan.decisionPoints,
    releasePoint: releasePointOf(plan),
    branchPoints: plan.branchPoints,
  };
}

type Loaded = { ok: true; plan: WorkflowPlanFile } | { ok: false; document: PlanDocument };

function planInvalid(refusals: readonly PlanRefusal[]): PlanDocument {
  const reasons = refusals.map((each) => ({
    reason: "plan-invalid" as const,
    subject: each.subject,
    file: `${each.route}.yml`,
    cause: each.reason,
  }));
  const message =
    "A plan the package ships does not load in this project. Reinstall qfai, or rerun its init with --force to restore the missing steps.";
  return refusal(message, reasons);
}

async function loaded(root: string, route: WorkflowRoute): Promise<Loaded> {
  const load = await loadInstalledPlan(root, route);
  return load.ok ? load : { ok: false, document: planInvalid(load.refusals) };
}

async function candidatesOf(
  root: string,
  choices: readonly RouteChoice[],
  recommended: WorkflowRoute,
): Promise<PlanDocument> {
  const candidates: PlanCandidate[] = [];
  for (const choice of choices) {
    const load = await loaded(root, choice.route);
    if (!load.ok) return load.document;
    const { family, stages } = load.plan;
    const summary = `${FAMILY_SUMMARIES[family] ?? "Run this plan."} Stages: ${stages.map((stage) => stage.id).join(", ")}.`;
    candidates.push({
      route: choice.route,
      family,
      rule: choice.rule,
      summary,
      recommended: choice.route === recommended,
    });
  }
  return { ok: true, candidates };
}

async function planOfExtraction(root: string, extraction: unknown): Promise<PlanDocument> {
  if (!isExtraction(extraction)) {
    const subjects = extractionFaults(extraction);
    const message =
      "The extraction does not match its schema: a field is missing, unknown or holds a value it does not take. Fix the named fields and try again.";
    return refusal(
      message,
      subjects.map((subject) => ({ reason: "schema", subject })),
    );
  }
  const { defaultsOf, refusals } = await routeDefaults();
  const outcome = routingOutcome(extraction, defaultsOf);
  if (refusals.length > 0) return planInvalid(refusals);
  if ("candidates" in outcome) return candidatesOf(root, outcome.candidates, outcome.recommended);
  const load = await loaded(root, outcome.taken.route);
  return load.ok ? planned(load.plan, outcome.taken.rule) : load.document;
}

// The plan of an extraction or of a named route, the candidates of a low-confidence extraction,
// or the refusal.
export async function planOf(root: string, input: PlanInput): Promise<PlanDocument> {
  if ("extraction" in input) return planOfExtraction(root, input.extraction);
  if (!isWorkflowRoute(input.route)) {
    const message = "No route has that name. Name a route of the catalog.";
    return refusal(message, [{ reason: "unknown-route", subject: input.route }]);
  }
  const load = await loaded(root, input.route);
  return load.ok ? planned(load.plan) : load.document;
}
