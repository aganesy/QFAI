import {
  DEFAULT_SPECS_DIR,
  refusedInput,
  REPLAN_BUDGET,
  scopeOf,
  STORY_AUTHORING_KINDS,
  UNTARGETED_KINDS,
  type PlanStage,
} from "./common.js";
import { carries, modifierNames } from "./modifiers.js";
import { releaseQuestion } from "./routeDecision.js";
import { flowBindingOf, planNotReady } from "./stages.js";
import {
  isReadOnlyStage,
  issuableSteps,
  ownerOfStep,
  repairOwnerOf,
  SEAM_STEP,
  servingStage,
  servingSteps,
  stepRefs,
} from "./steps.js";
import type {
  PlanStages,
  PlanStep,
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowQuestion,
  WorkflowRun,
  WorkflowSeamRequest,
  WorkflowSnapshot,
  WorkflowStorySlot,
  WorkflowWorkOrder,
} from "./types.js";

type Plan = NonNullable<WorkflowSnapshot["plan"]>;

const IMPLEMENTATION_HEAVY_ROLES = ["qa-gatekeeper", "implementation-reviewer"];

const UPGRADED_OWNERS = ["qfai-implement", "qfai-atdd"];

// The reviewers of every step the work order runs, reviewed once at the end of the stage. A run
// that restores an authorization check reviews its implementation work harder, and asks nobody
// first.
function requiredReviewerRoles(
  steps: readonly string[],
  plan: Plan,
  facts: WorkflowFacts,
): string[] | undefined {
  const restored = (plan.riskSignals ?? []).includes("authorization-restored");
  const perStep = steps.flatMap((step) => {
    const upgraded = restored && UPGRADED_OWNERS.includes(ownerOfStep(step));
    const roles = upgraded ? IMPLEMENTATION_HEAVY_ROLES : facts.reviewerRoles?.[step];
    return roles ? [roles] : [];
  });
  const roles = [...new Set(perStep.flat())];
  return roles.length > 0 ? roles : undefined;
}

// An external effect is allowed only where a project policy names it. A request that asks
// for one authorizes nothing.
function allowedEffects(stage: PlanStage, snapshot: WorkflowSnapshot): string[] {
  const named = new Set(
    (snapshot.authorizations ?? [])
      .filter((authorization) => authorization.kind === "project_policy")
      .flatMap((authorization) => authorization.policy?.effects ?? []),
  );
  return (stage.effects ?? []).filter((effect) => named.has(effect));
}

export function createQuestion(questionId: string, story: WorkflowStorySlot): WorkflowQuestion {
  const where = story.flowId ? `in ${story.flowId}` : "in a new flow";
  return {
    questionId,
    kind: "create",
    text: `Create a story ${where} for ${story.goal}?`,
    options: [
      {
        optionId: "create",
        label: "Create it",
        description: "Story authoring writes the new story.",
        effect: "proceed",
      },
      {
        optionId: "decline",
        label: "Do not create it",
        description: "The run ends without creating the story.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "create",
    story,
  };
}

export function reaskCreate(run: WorkflowRun, story: WorkflowStorySlot): WorkflowDecision {
  const question = createQuestion(`question-${run.sequence + 1}-1`, story);
  return {
    verdict: {
      ok: true,
      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
      questions: [question],
      workOrder: null,
    },
    events: [{ type: "question-opened", question }, { type: "material-decision" }],
  };
}

export function currentStory(snapshot: WorkflowSnapshot): WorkflowStorySlot | undefined {
  const slotId = snapshot.approval?.target?.slotId;
  return snapshot.stories?.find((story) => story.slotId === slotId);
}

export function approvalIsStale(snapshot: WorkflowSnapshot): boolean {
  const recorded = snapshot.approval?.scopeDigest;
  const approved = snapshot.approval?.target?.story;
  const current = currentStory(snapshot);
  const text = (story: Omit<WorkflowStorySlot, "slotId">) =>
    JSON.stringify([story.goal, story.covers, story.excludes, story.flowId]);
  return (
    (recorded !== undefined &&
      snapshot.scopeDigest !== undefined &&
      recorded !== snapshot.scopeDigest) ||
    (approved !== undefined && current !== undefined && text(approved) !== text(current))
  );
}

// The flow a work order issued now would bind: the run's bound flow, or the existing flow the
// approved new-story slot joins.
export function flowOfRun(snapshot: WorkflowSnapshot): string | undefined {
  return snapshot.flowBinding?.flowId ?? snapshot.approval?.target?.story?.flowId ?? undefined;
}

// An `sdd_append` work order names the diagnosis's reproduction record as its input, at the
// digest the file has now. A record that names no readable file has no digest, and is not named.
function diagnosisInputs(stageKind: string, snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  const diagnosis = snapshot.diagnosis;
  const digest = diagnosis ? facts.fileDigests?.[diagnosis.reproductionRef] : undefined;
  if (stageKind !== "sdd_append" || !diagnosis || digest === undefined) return [];
  return [{ path: diagnosis.reproductionRef, digest }];
}

// The records a stage is defined to write for the flow its work order binds, each named for
// that flow. Every other kind writes only its checked scope or git-ignored output.
// A prototype work order names no record. Defect example seeding names no contract while rules
// in several contracts cite the matched criterion's examples, which is open: the stage then
// returns `blocked` to the operator instead of choosing one.
function recordAreasOf(
  workOrder: WorkflowWorkOrder,
  flowId: string | undefined,
  facts: WorkflowFacts,
) {
  const specs = facts.specsDir ?? DEFAULT_SPECS_DIR;
  const tables = [`${specs}/decisions.md`, `${specs}/open-questions.md`];
  const implement = flowId ? [`.qfai/evidence/implement-${flowId}.md`] : [];
  const atdd = flowId ? [`.qfai/evidence/atdd-${flowId}.md`] : [];
  const sddEvidence = flowId ? [`.qfai/evidence/sdd-${flowId}.md`] : [];
  switch (workOrder.stageKind) {
    case "implement":
    case "regression_fix":
      return implement;
    case "test_fix":
      return [...atdd, ...implement];
    case "acceptance":
      return atdd;
    case "sdd_append": {
      const seeding = facts.seeding;
      const contract = seeding?.contractFiles.length === 1 ? seeding.contractFiles : [];
      const example = seeding?.exampleFile ? [seeding.exampleFile] : [];
      return [...example, ...contract, `${specs}/decisions.md`, ...sddEvidence];
    }
    case "sdd":
      return [...tables, ...sddEvidence];
    default:
      return [];
  }
}

// A stage that runs only read-only steps writes nothing; every other stage may write the checked
// scope.
function writeAreasOf(plan: Plan, steps: readonly PlanStep[]): string[] {
  return isReadOnlyStage(steps) ? [] : (plan.writeScope ?? []);
}

// The base of every plan stage's work order: identity, steps, scope and history.
function baseWorkOrder(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  stage: PlanStage,
  facts: WorkflowFacts,
  steps: PlanStep[],
): WorkflowWorkOrder {
  const attempt = (snapshot.attempts?.[stage.stageInstanceId] ?? 0) + 1;
  const reviewerRoles = requiredReviewerRoles(
    steps.map((step) => step.name),
    plan,
    facts,
  );
  const modifiers = modifierNames(snapshot.modifiers);
  const actorHistory = snapshot.actorHistory ?? [];
  const receiptRefs = snapshot.receiptRefs ?? [];
  return {
    workOrderId: `work-order-${stage.stageInstanceId}-${attempt}`,
    stageInstanceId: stage.stageInstanceId,
    attempt,
    stageKind: stage.stageKind,
    ...(steps.length > 0 ? { steps: stepRefs(steps) } : {}),
    ...(modifiers.length > 0 ? { modifiers } : {}),
    ...(plan.writeScope
      ? { scope: scopeOf(writeAreasOf(plan, steps), allowedEffects(stage, snapshot)) }
      : {}),
    ...(reviewerRoles ? { requiredReviewerRoles: reviewerRoles } : {}),
    ...(actorHistory.length > 0 ? { actorHistory } : {}),
    ...(snapshot.settled ? { settled: snapshot.settled } : {}),
    ...(receiptRefs.length > 0
      ? {
          priorStageReceiptRefs: receiptRefs.map((ref) => ({
            ref,
            validity: facts.receiptValidity?.[ref] ?? "unknown",
          })),
        }
      : {}),
  };
}

// The story-authoring work order for a new-story slot, or the `create` question asked again
// when its approval has no persisted ID or went stale.
function newStoryTarget(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
): WorkflowWorkOrder | WorkflowDecision {
  const { run, approval } = snapshot;
  const slotId = approval?.target?.slotId;
  if (!slotId) return refusedInput(run, "The story work order is not ready.");
  if (!approval.authorizationId || approvalIsStale(snapshot)) {
    const story = approval.target?.story;
    if (!story) return refusedInput(run, "The story work order is not ready.");
    return reaskCreate(run, currentStory(snapshot) ?? { ...story, slotId });
  }
  return {
    ...workOrder,
    target: { kind: "new_story", slotId },
    authorizationRefs: [`authorizations/${approval.authorizationId}.json`],
  };
}

// The target a stage's work order binds: none for the untargeted kinds or in a run that binds no
// flow, the slot for a new story, and otherwise the run's one bound flow.
function withTarget(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  workOrder: WorkflowWorkOrder,
): WorkflowWorkOrder | WorkflowDecision {
  if (UNTARGETED_KINDS.includes(workOrder.stageKind)) return workOrder;
  if (flowBindingOf(plan.stages) !== "required") {
    const bound = snapshot.flowBinding?.flowId;
    return bound ? { ...workOrder, target: { kind: "flow", flowId: bound } } : workOrder;
  }
  if (workOrder.stageKind === "sdd" && !snapshot.flowBinding) {
    return newStoryTarget(snapshot, workOrder);
  }
  const flowId = snapshot.flowBinding?.flowId;
  if (!flowId) return refusedInput(snapshot.run, "The flow work order is not ready.");
  return { ...workOrder, target: { kind: "flow", flowId } };
}

// The obligation set the work order names, and the run's own view of which examples tests
// annotate, which the work order never carries.
function obligationsOf(flowId: string | undefined, facts: WorkflowFacts) {
  const obligations = facts.obligations;
  if (!flowId || obligations?.flowId !== flowId) return {};
  const { ids, digest, exampleIds, annotated } = obligations;
  return {
    obligations: { flowId, ids, digest },
    obligationSet: { flowId, exampleIds, annotated },
  };
}

export function issueWorkOrder(
  run: WorkflowRun,
  workOrder: WorkflowWorkOrder,
  extras: Partial<WorkflowEvent> = {},
): WorkflowDecision {
  const events: WorkflowEvent[] = [
    { type: "work-order-issued", workOrder, ...extras },
    { type: "dispatch-work-order" },
  ];
  return {
    verdict: {
      ok: true,
      run: { ...run, state: "running", sequence: run.sequence + events.length },
      workOrder,
    },
    events,
  };
}

function issueSeamOnly(snapshot: WorkflowSnapshot, seam: WorkflowSeamRequest): WorkflowDecision {
  const flowId = snapshot.flowBinding?.flowId;
  if (!flowId) return refusedInput(snapshot.run, "The seam work order is not ready.");
  return issueWorkOrder(snapshot.run, {
    workOrderId: `work-order-${seam.stageInstanceId}-seam-${seam.attempt}`,
    stageInstanceId: `${seam.stageInstanceId}-seam-${seam.attempt}`,
    attempt: 1,
    stageKind: "implement",
    target: { kind: "flow", flowId },
    steps: stepRefs([SEAM_STEP]),
    parentWorkOrderId: seam.parentWorkOrderId,
  });
}

// A routing receipt that no longer holds sends the run back to routing before any work. Once the
// run has spent its replans it is blocked instead, naming the spent budget.
function planRevision(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
): WorkflowDecision | undefined {
  const ref = snapshot.routingReceiptRef;
  if (ref === undefined || facts.receiptValidity?.[ref] === "valid") return undefined;
  if ((snapshot.replans ?? 0) >= REPLAN_BUDGET) {
    const halt = { blocker: "budget-exhausted" as const, owner: "operator", subjects: ["replan"] };
    const blocked = { ...snapshot.run, state: "blocked", sequence: snapshot.run.sequence + 1 };
    return {
      verdict: { ok: true, run: blocked, workOrder: null, halt },
      events: [{ type: "budget-exhausted", halt }],
    };
  }
  const run = { ...snapshot.run, state: "routing", sequence: snapshot.run.sequence + 1 };
  return { verdict: { ok: true, run }, events: [{ type: "required-plan-revision" }] };
}

// The stage `next` issues, and the steps it runs: the first stage not yet accepted, with every
// step. While a repair is open, the first stage holding a step that serves the next finding's
// owner, with only the steps that serve it; the stage that found it runs whole, less a step a
// carried receipt satisfied. A repair owned by no stage of the plan never reaches here: `accept`
// blocks the run on it.
function stageToIssue(
  snapshot: WorkflowSnapshot,
  selected: PlanStages,
): { stage?: PlanStage | undefined; steps: PlanStep[]; refused?: true } {
  const owner = repairOwnerOf(snapshot);
  const serving = owner ? servingStage(selected, owner) : undefined;
  if (owner && !serving) return { steps: [], refused: true };
  const stage = serving ?? selected[(snapshot.acceptedStages ?? []).length];
  if (!stage) return { steps: [] };
  const detecting = stage.stageInstanceId === snapshot.repairRequest?.stageInstanceId;
  const steps = owner && !detecting ? servingSteps(stage, owner) : issuableSteps(snapshot, stage);
  const declared = (stage.steps ?? []).length > 0;
  return declared && steps.length === 0 ? { steps, refused: true } : { stage, steps };
}

// The work order for one plan stage, with its target, inputs, obligations and records.
function stageWorkOrder(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  stage: PlanStage,
  facts: WorkflowFacts,
  steps: PlanStep[],
): WorkflowDecision {
  const targeted = withTarget(snapshot, plan, baseWorkOrder(snapshot, plan, stage, facts, steps));
  if ("verdict" in targeted) return targeted;
  const flowId = targeted.target?.kind === "flow" ? targeted.target.flowId : flowOfRun(snapshot);
  const inputs = diagnosisInputs(stage.stageKind, snapshot, facts);
  const { obligations, obligationSet } = obligationsOf(flowId, facts);
  const recordAreas = recordAreasOf(targeted, flowId, facts);
  const workOrder: WorkflowWorkOrder = {
    ...targeted,
    ...(inputs.length > 0 ? { inputs } : {}),
    ...(obligations ? { obligations } : {}),
    ...(recordAreas.length > 0 ? { recordAreas } : {}),
  };
  const records = STORY_AUTHORING_KINDS.includes(stage.stageKind) ? facts.records : undefined;
  return issueWorkOrder(snapshot.run, workOrder, {
    ...(obligationSet ? { obligationSet } : {}),
    ...(records ? { recordsAtIssue: records } : {}),
  });
}

// Whether `gate:release` stops the run before this stage: the stage runs the route's release
// point, or, on a route that names none, every stage is in. Once a release approval is recorded,
// nothing stops the run.
function releaseDue(snapshot: WorkflowSnapshot, plan: Plan, stage: PlanStage | undefined) {
  if (!carries(snapshot, "gate:release") || snapshot.releaseApproval) return false;
  const atPoint = (each: PlanStage) =>
    (each.steps ?? []).some((step) => step.decisionPoint === "release");
  return stage ? atPoint(stage) : !plan.stages.some(atPoint);
}

// The release question, opened by `next` where the route's release point is reached.
function openRelease(run: WorkflowRun, plan: Plan): WorkflowDecision {
  const question = releaseQuestion(`question-${run.sequence + 1}-1`, plan.goal ?? plan.route);
  return {
    verdict: {
      ok: true,
      run: { ...run, state: "awaiting_input", sequence: run.sequence + 2 },
      questions: [question],
      workOrder: null,
    },
    events: [{ type: "question-opened", question }, { type: "material-decision" }],
  };
}

// `next` on a run in `ready`: the next work order of the plan, or none once every stage is in.
export function issueNext(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run } = snapshot;
  const revision = planRevision(snapshot, facts);
  if (revision) return revision;
  const plan = snapshot.plan;
  if (!plan || planNotReady(snapshot)) return refusedInput(run, "The plan is not ready.");
  if (snapshot.seamRequest) return issueSeamOnly(snapshot, snapshot.seamRequest);
  const next = stageToIssue(snapshot, plan.stages);
  if (next.refused) return refusedInput(run, "The work order is not ready.");
  if (releaseDue(snapshot, plan, next.stage)) return openRelease(run, plan);
  if (!next.stage) return { verdict: { ok: true, run, workOrder: null }, events: [] };
  return stageWorkOrder(snapshot, plan, next.stage, facts, next.steps);
}
