import { firstMatchedKind } from "./common.js";
import type { PlanStages, WorkflowFacts, WorkflowSnapshot } from "./types.js";

type Plan = NonNullable<WorkflowSnapshot["plan"]>;

type PredicateFacts = Pick<WorkflowFacts, "acceptanceObligationsUnmet" | "prototypeDecisionNeeded">;

// Whether one plan predicate holds for the run as it stands.
function predicateHolds(
  when: string | undefined,
  plan: Plan,
  diagnosis: WorkflowSnapshot["diagnosis"],
  facts: PredicateFacts,
): boolean {
  const verdict = diagnosis?.verdict;
  switch (when) {
    // Every plan file names a predicate for each stage; a stage with none runs.
    case undefined:
    case "always":
      return true;
    // An example already stating the case is the diagnosis's first matched ID.
    case "missing_example_needed":
      return verdict === "missing-test" && firstMatchedKind(diagnosis) !== "EX";
    case "diagnosis_missing_test":
      return verdict === "missing-test";
    case "acceptance_obligations_unmet":
      return facts.acceptanceObligationsUnmet === true;
    // While how a UI contract serves a flow is open, one does when one of its rules cites an
    // example of the flow, so a project with no UI contract has no prototype stage.
    case "prototype_decision_needed":
      return facts.prototypeDecisionNeeded === true;
    // Routing chose discovery because product scope is open, which is what a full discussion
    // settles.
    case "full_discussion_needed":
      return plan.route === "discovery";
    case "regression_found":
      return verdict === "regression";
    case "test_defect_found":
      return verdict === "defective-test";
    default:
      return false;
  }
}

// The plan's stages that run, in plan order. A stage already issued or accepted keeps running
// whatever its predicate says now, since its own work can change what the predicate reads, and
// one the run recorded as skipped stays skipped. Every other stage runs when its predicate holds.
export function activeStages(
  plan: Plan,
  snapshot: WorkflowSnapshot,
  facts: PredicateFacts,
): PlanStages {
  const ran = new Set([
    ...(snapshot.acceptedStages ?? []).map((stage) => stage.stageInstanceId),
    ...(snapshot.outstandingWorkOrder ? [snapshot.outstandingWorkOrder.stageInstanceId] : []),
  ]);
  const skipped = new Set(snapshot.skippedStages ?? []);
  return plan.stages.filter(
    (stage) =>
      ran.has(stage.stageInstanceId) ||
      (!skipped.has(stage.stageInstanceId) &&
        predicateHolds(stage.when, plan, snapshot.diagnosis, facts)),
  );
}

const BUGFIX_PREDICATES = [
  "always",
  "missing_example_needed",
  "diagnosis_missing_test",
  "acceptance_obligations_unmet",
  "regression_found",
  "test_defect_found",
];

function everyStageNamed(stages: PlanStages): boolean {
  return stages.every((stage) => Boolean(stage.skill) && Boolean(stage.operation));
}

function directIsInvalid(stages: PlanStages): boolean {
  const [edit, verify] = stages;
  return (
    stages.length !== 2 ||
    edit?.stageKind !== "maintenance" ||
    edit.skill !== "qfai-maintain" ||
    edit.operation !== "non-normative-edit" ||
    verify?.stageKind !== "verify" ||
    verify.skill !== "qfai-verify" ||
    verify.operation !== "verify-full"
  );
}

function boundedIsInvalid(stages: PlanStages, first: string, predicates: string[]): boolean {
  return (
    stages[0]?.stageKind !== first ||
    stages.at(-1)?.stageKind !== "verify" ||
    !everyStageNamed(stages) ||
    stages.some((stage) => !predicates.includes(stage.when ?? ""))
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
      return !bound || boundedIsInvalid(stages, "diagnose", BUGFIX_PREDICATES);
    case "bounded-change":
      return (
        !bound || boundedIsInvalid(stages, "sdd_delta", ["always", "acceptance_obligations_unmet"])
      );
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
