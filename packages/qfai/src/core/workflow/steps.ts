import { ASSISTANT_DIR } from "../paths/assistantPaths.js";
import { skillOwnerOf } from "./common.js";
import type {
  PlanStages,
  PlanStep,
  WorkflowSnapshot,
  WorkflowStepRef,
  WorkflowWorkOrder,
} from "./types.js";

type PlanStage = PlanStages[number];

// The step the core issues from an acceptance result's seam request, and no plan stage names.
export const SEAM_STEP = "implement-seam";

// Where an installed step's entry file sits, relative to the project root.
export function stepPath(name: string): string {
  return `${ASSISTANT_DIR}/step/${name}/STEP.md`;
}

// The work-order entry of each step, a bare name being a step the route marks nothing on.
export function stepRefs(steps: readonly (string | PlanStep)[]): WorkflowStepRef[] {
  return steps.map((step) => {
    const entry: PlanStep = typeof step === "string" ? { name: step } : step;
    return {
      name: entry.name,
      path: stepPath(entry.name),
      mode: entry.mode ?? null,
      passThrough: entry.passThrough ?? false,
      decisionPoint: entry.decisionPoint ?? null,
      branchPoint: entry.branchPoint ?? false,
    };
  });
}

// Whether a stage runs only read-only steps, so that it may write nothing.
export function isReadOnlyStage(steps: readonly PlanStep[]): boolean {
  return steps.length > 0 && steps.every((step) => step.mode === "read-only");
}

// A step is named `<owner>-<name>`: `common-*` belongs to no skill, and every other prefix is
// the skill that lists it without its `qfai-` prefix.
// SIMPLIFIED: the owner is read from the name, not from the step's `owner` frontmatter.
// Lift when: a step's `owner` is allowed to differ from its name's prefix.
export function ownerOfStep(name: string): string {
  const prefix = name.split("-")[0] ?? name;
  return prefix === "common" ? "common" : `qfai-${prefix}`;
}

// A stage's steps, every one of which runs whenever the stage does, in plan order.
export function stageSteps(stage: PlanStage): PlanStep[] {
  return stage.steps ?? [];
}

// Whether a step serves a finding's owner: the owner names the step, or the skill it belongs to.
export function stepServes(step: string, owner: string): boolean {
  return step === owner || ownerOfStep(step) === owner;
}

// The steps of a stage that serve a finding's owner.
export function servingSteps(stage: PlanStage, owner: string): PlanStep[] {
  return stageSteps(stage).filter((step) => stepServes(step.name, owner));
}

// The first stage holding a step that serves `owner`, which is where its finding is repaired.
export function servingStage(selected: readonly PlanStage[], owner: string): PlanStage | undefined {
  return selected.find((stage) => servingSteps(stage, owner).length > 0);
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
