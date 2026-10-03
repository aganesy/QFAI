import { isWorkflowRoute } from "./routes.js";
import type { PlanStages, WorkflowSnapshot } from "./types.js";

type Plan = NonNullable<WorkflowSnapshot["plan"]>;

type PlanStage = PlanStages[number];

// The stage kinds that work on a flow whatever steps they run.
const FLOW_KINDS = ["sdd", "sdd_append", "prototype"];

// The steps that change the product's code against a flow's examples.
const FLOW_STEPS = ["implement-tdd", "implement-regression-fix", "implement-acceptance"];

function stepNames(stage: PlanStage): string[] {
  return (stage.steps ?? []).map((step) => step.name);
}

function runsStep(stages: PlanStages, step: string): boolean {
  return stages.some((stage) => stepNames(stage).includes(step));
}

// How a route binds a flow: a route with a stage that works on one binds exactly one; a route
// whose only such stage is a test fix binds the one the proposal names, or none; any other
// route binds none.
export function flowBindingOf(stages: PlanStages): "required" | "optional" | "none" {
  const required = stages.some(
    (stage) =>
      FLOW_KINDS.includes(stage.stageKind) ||
      stepNames(stage).some((step) => FLOW_STEPS.includes(step)),
  );
  if (required) return "required";
  return stages.some((stage) => stage.stageKind === "test_fix") ? "optional" : "none";
}

// Whether the route runs the verify block, which makes it a change route.
export function runsVerifyBlock(stages: PlanStages): boolean {
  return runsStep(stages, "verify-repo-gate");
}

// Whether the route ends at `triage-close`, having changed no tracked file but its records.
export function endsAtTriageClose(stages: PlanStages): boolean {
  const last = stages.at(-1);
  return !runsVerifyBlock(stages) && last !== undefined && stepNames(last).includes("triage-close");
}

// Whether a stage's result must carry a diagnosis: it runs `implement-diagnose` in a mode that
// can change what the run does next.
export function needsDiagnosis(stage: PlanStage): boolean {
  return (stage.steps ?? []).some(
    (step) => step.name === "implement-diagnose" && step.mode !== "read-only",
  );
}

function approvalIsValid(approval: WorkflowSnapshot["approval"]): boolean {
  return (
    approval?.kind === "human_decision" &&
    approval.operation === "CREATE" &&
    approval.effect === "proceed" &&
    approval.target?.kind === "new_story" &&
    Boolean(approval.target.slotId) &&
    (approval.authorizationId === undefined ||
      /^[A-Za-z0-9_-]{1,64}$/.test(approval.authorizationId))
  );
}

// Whether the plan breaks the shape a route promises: a catalog route whose stages all name
// their steps, and, for a route that binds a flow, the flow the run binds or an approved new
// story an `sdd` stage writes.
export function routePlanIsInvalid(plan: Plan, snapshot: WorkflowSnapshot): boolean {
  const { stages } = plan;
  if (!isWorkflowRoute(plan.route) || stages.some((stage) => stepNames(stage).length === 0)) {
    return true;
  }
  if (flowBindingOf(stages) !== "required") return false;
  if (/^BF-\d{4}$/.test(snapshot.flowBinding?.flowId ?? "")) return false;
  return !stages.some((stage) => stage.stageKind === "sdd") || !approvalIsValid(snapshot.approval);
}

// Whether the run's plan and its accepted stages cannot be issued from. Every stage of the plan
// runs, in plan order.
export function planNotReady(snapshot: WorkflowSnapshot): boolean {
  const plan = snapshot.plan;
  if (!plan || !Array.isArray(plan.stages) || plan.stages.length === 0) return true;
  const accepted = snapshot.acceptedStages ?? [];
  const ids = plan.stages.map((stage) => stage.stageInstanceId);
  const diagnosed = plan.stages.slice(0, accepted.length).some((stage) => needsDiagnosis(stage));
  return (
    plan.stages.some((stage) => !stage.stageInstanceId || !stage.stageKind) ||
    new Set(ids).size !== ids.length ||
    routePlanIsInvalid(plan, snapshot) ||
    (diagnosed && !snapshot.diagnosis) ||
    accepted.length > plan.stages.length ||
    accepted.some(
      (stage, index) =>
        (stage.outcome !== "accepted" && stage.outcome !== "accepted_with_debt") ||
        stage.stageInstanceId !== plan.stages[index]?.stageInstanceId ||
        stage.stageKind !== plan.stages[index].stageKind,
    )
  );
}
