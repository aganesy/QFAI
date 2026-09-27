import { ASSISTANT_DIR } from "../paths/assistantPaths.js";
import { firstMatchedKind, skillOwnerOf } from "./common.js";
import type { PlanStages, PlanStep, WorkflowSnapshot, WorkflowWorkOrder } from "./types.js";

type PlanStage = PlanStages[number];

type StepPlan = Pick<NonNullable<WorkflowSnapshot["plan"]>, "optionalSteps">;

// The step the core issues from an acceptance result's seam request, and no plan stage names.
export const SEAM_STEP = "implement-seam";

// Where an installed step's entry file sits, relative to the project root.
export function stepPath(name: string): string {
  return `${ASSISTANT_DIR}/step/${name}/STEP.md`;
}

export function stepRefs(names: readonly string[]): NonNullable<WorkflowWorkOrder["steps"]> {
  return names.map((name) => ({ name, path: stepPath(name) }));
}

// A step is named `<owner>-<name>`: `common-*` belongs to no skill, and every other prefix is
// the skill that lists it without its `qfai-` prefix.
// SIMPLIFIED: the owner is read from the name, not from the step's `owner` frontmatter.
// Lift when: a step's `owner` is allowed to differ from its name's prefix.
export function ownerOfStep(name: string): string {
  const prefix = name.split("-")[0] ?? name;
  return prefix === "common" ? "common" : `qfai-${prefix}`;
}

// Whether a step runs in this run: `proposed` when the checked proposal listed it, and the two
// test-fix layers by the kind of the diagnosis's first matched ID.
function stepHolds(
  step: PlanStep,
  plan: StepPlan,
  diagnosis: WorkflowSnapshot["diagnosis"],
): boolean {
  const kind = firstMatchedKind(diagnosis);
  switch (step.when) {
    case undefined:
      return true;
    case "proposed":
      return (plan.optionalSteps ?? []).includes(step.name);
    case "test_defect_acceptance_layer":
      return kind === "BF" || kind === "AC";
    case "test_defect_example_layer":
      return kind === "EX";
    default:
      return false;
  }
}

// The names of a stage's steps that run, in plan order.
export function activeSteps(
  stage: PlanStage,
  plan: StepPlan,
  diagnosis: WorkflowSnapshot["diagnosis"],
): string[] {
  return (stage.steps ?? [])
    .filter((step) => stepHolds(step, plan, diagnosis))
    .map((step) => step.name);
}

// Whether a step serves a finding's owner: the owner names the step, or the skill it belongs to.
export function stepServes(step: string, owner: string): boolean {
  return step === owner || ownerOfStep(step) === owner;
}

// The active steps of a stage that serve a finding's owner.
export function servingSteps(
  stage: PlanStage,
  owner: string,
  plan: StepPlan,
  diagnosis: WorkflowSnapshot["diagnosis"],
): string[] {
  return activeSteps(stage, plan, diagnosis).filter((step) => stepServes(step, owner));
}

// The first active stage holding a step that serves `owner`, which is where its finding is
// repaired.
export function servingStage(
  selected: readonly PlanStage[],
  owner: string,
  plan: StepPlan,
  diagnosis: WorkflowSnapshot["diagnosis"],
): PlanStage | undefined {
  return selected.find((stage) => servingSteps(stage, owner, plan, diagnosis).length > 0);
}

// The owner of the open repair request's next finding, which `next` issues the repair to.
export function repairOwnerOf(snapshot: Pick<WorkflowSnapshot, "repairRequest">) {
  return snapshot.repairRequest?.debts.map(skillOwnerOf).find(Boolean);
}

// Who a set of steps reports to the operator: the skill owning the first step a skill owns,
// the first step itself when only common steps run, or the operator when none does.
export function ownerOfSteps(steps: readonly string[]): string {
  const owned = steps.find((step) => ownerOfStep(step) !== "common");
  return owned ? ownerOfStep(owned) : (steps[0] ?? "operator");
}

export function stepNamesOf(workOrder: Pick<WorkflowWorkOrder, "steps"> | undefined): string[] {
  return (workOrder?.steps ?? []).map((step) => step.name);
}

// Whether a work order is the seam-only one an acceptance result's seam request issued.
export function isSeamOrder(workOrder: Pick<WorkflowWorkOrder, "steps"> | undefined): boolean {
  return stepNamesOf(workOrder).includes(SEAM_STEP);
}
