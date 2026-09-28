import type { PlanStages, WorkflowFacts, WorkflowSnapshot } from "./types.js";

type Plan = NonNullable<WorkflowSnapshot["plan"]>;

type PlanStage = PlanStages[number];

type StageFacts = Pick<WorkflowFacts, "prototypeDecisionNeeded">;

// The diagnosis verdict whose branch each stage kind after a diagnose stage belongs to.
const BRANCH_OF: Record<string, string> = {
  sdd_append: "missing-test",
  acceptance: "missing-test",
  implement: "missing-test",
  regression_fix: "regression",
  test_fix: "defective-test",
};

// Every stage runs, with two exceptions no plan declares yet: after a diagnose stage, the
// diagnosis verdict selects its branch's stages, and a prototype stage runs only while how a UI
// contract serves the flow is open, which is when one of its rules cites an example of the flow.
// SIMPLIFIED: the core selects these stages itself, since a plan declares no branch point.
// Lift when: a plan declares branch points, and a verdict or a prototype need re-routes the run
// to a route of its own.
function stageRuns(
  plan: Plan,
  stage: PlanStage,
  diagnosis: WorkflowSnapshot["diagnosis"],
  facts: StageFacts,
): boolean {
  if (stage.stageKind === "prototype") return facts.prototypeDecisionNeeded === true;
  const branch = BRANCH_OF[stage.stageKind];
  const diagnosed = plan.stages.some((each) => each.stageKind === "diagnose");
  return !diagnosed || branch === undefined || diagnosis?.verdict === branch;
}

// The plan's stages that run, in plan order. A stage the run has issued keeps running whatever
// the diagnosis or the tree says now, since its own work can change what they say, and one the
// run recorded as passed over stays so.
export function activeStages(
  plan: Plan,
  snapshot: WorkflowSnapshot,
  facts: StageFacts,
): PlanStages {
  const ran = new Set([
    ...(snapshot.acceptedStages ?? []).map((stage) => stage.stageInstanceId),
    ...(snapshot.issuedStages ?? []),
    ...(snapshot.outstandingWorkOrder ? [snapshot.outstandingWorkOrder.stageInstanceId] : []),
  ]);
  const skipped = new Set(snapshot.skippedStages ?? []);
  return plan.stages.filter(
    (stage) =>
      ran.has(stage.stageInstanceId) ||
      (!skipped.has(stage.stageInstanceId) && stageRuns(plan, stage, snapshot.diagnosis, facts)),
  );
}

function everyStageNamed(stages: PlanStages): boolean {
  return stages.every((stage) => (stage.steps ?? []).length > 0);
}

function directIsInvalid(stages: PlanStages): boolean {
  const [edit, verify] = stages;
  const editSteps = (edit?.steps ?? []).map((step) => step.name);
  return (
    stages.length !== 2 ||
    edit?.stageKind !== "maintenance" ||
    editSteps.join(",") !== "maintain-edit" ||
    verify?.stageKind !== "verify" ||
    !everyStageNamed(stages)
  );
}

function boundedIsInvalid(stages: PlanStages, first: string): boolean {
  return (
    stages[0]?.stageKind !== first ||
    stages.at(-1)?.stageKind !== "verify" ||
    !everyStageNamed(stages)
  );
}

function featureIsInvalid(stages: PlanStages, approval: WorkflowSnapshot["approval"]): boolean {
  return (
    stages[0]?.stageKind !== "sdd" ||
    stages.at(-1)?.stageKind !== "verify" ||
    approval?.kind !== "human_decision" ||
    approval.operation !== "CREATE" ||
    approval.effect !== "proceed" ||
    approval.target?.kind !== "new_story" ||
    !approval.target.slotId ||
    (approval.authorizationId !== undefined &&
      !/^[A-Za-z0-9_-]{1,64}$/.test(approval.authorizationId))
  );
}

// Whether the plan breaks the shape its route promises. A route whose stages take a flow target
// needs the flow the run binds.
export function routePlanIsInvalid(plan: Plan, snapshot: WorkflowSnapshot): boolean {
  const { stages } = plan;
  const bound = /^BF-\d{4}$/.test(snapshot.flowBinding?.flowId ?? "");
  switch (plan.route) {
    case "direct":
      return directIsInvalid(stages);
    case "bugfix":
      return !bound || boundedIsInvalid(stages, "diagnose");
    case "bounded-change":
      return !bound || boundedIsInvalid(stages, "sdd_delta");
    case "feature":
      return featureIsInvalid(stages, snapshot.approval);
    case "discovery":
      return !everyStageNamed(stages);
    default:
      return true;
  }
}

// Whether the run's plan and its accepted stages cannot be issued from.
export function planNotReady(snapshot: WorkflowSnapshot, facts: WorkflowFacts): boolean {
  const plan = snapshot.plan;
  if (!plan || !Array.isArray(plan.stages) || plan.stages.length === 0) return true;
  const accepted = snapshot.acceptedStages ?? [];
  const selected = activeStages(plan, snapshot, facts);
  const ids = plan.stages.map((stage) => stage.stageInstanceId);
  return (
    plan.stages.some((stage) => !stage.stageInstanceId || !stage.stageKind) ||
    new Set(ids).size !== ids.length ||
    routePlanIsInvalid(plan, snapshot) ||
    (plan.route === "bugfix" && accepted.length > 0 && !snapshot.diagnosis) ||
    accepted.length > selected.length ||
    accepted.some(
      (stage, index) =>
        (stage.outcome !== "accepted" && stage.outcome !== "accepted_with_debt") ||
        stage.stageInstanceId !== selected[index]?.stageInstanceId ||
        stage.stageKind !== selected[index].stageKind,
    )
  );
}
