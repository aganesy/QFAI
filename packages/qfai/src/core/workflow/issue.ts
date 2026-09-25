import {
  DEFAULT_SPECS_DIR,
  executorSkill,
  refusedInput,
  scopeOf,
  STORY_AUTHORING_KINDS,
  UNTARGETED_KINDS,
  type PlanStage,
} from "./common.js";
import { activeStages, planNotReady } from "./stages.js";
import type {
  PlanStages,
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

const IMPLEMENTATION_HEAVY_ROLES = [
  "completion-reviewer",
  "qa-gatekeeper",
  "implementation-reviewer",
];

// A run that restores an authorization check reviews its implementation work harder, and
// asks nobody first.
function requiredReviewerRoles(
  skill: string | undefined,
  plan: Plan,
  facts: WorkflowFacts,
): string[] | undefined {
  if (!skill) return undefined;
  const restored = (plan.riskSignals ?? []).includes("authorization-restored");
  if (restored && (skill === "qfai-implement" || skill === "qfai-atdd")) {
    return IMPLEMENTATION_HEAVY_ROLES;
  }
  return facts.reviewerRoles?.[skill];
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

// SIMPLIFIED: judges staleness only from the facts the snapshot carries.
// Lift when: the snapshot is rebuilt from the journal, which carries both digests and texts.
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

// SIMPLIFIED: an input whose digest the facts do not carry is left out of the work order.
// Lift when: the command adapter supplies the digest of every file a work order names.
function diagnosisInputs(stageKind: string, snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  const diagnosis = snapshot.diagnosis;
  const digest = diagnosis ? facts.fileDigests?.[diagnosis.reproductionRef] : undefined;
  if (stageKind !== "sdd_append" || !diagnosis || digest === undefined) return [];
  return [{ path: diagnosis.reproductionRef, digest }];
}

// The records a stage is defined to write for the flow its work order binds, each named for
// that flow. Every other kind writes only its checked scope or git-ignored output.
// SIMPLIFIED: a prototype work order names no record, as for a target that is not UI-bearing,
// and defect example seeding names no contract when rules in several contracts cite the matched
// criterion's examples. Lift when: the facts say whether a prototype's target is UI-bearing, and
// the choice among several citing contracts is settled.
function recordAreasOf(
  workOrder: WorkflowWorkOrder,
  flowId: string | undefined,
  facts: WorkflowFacts,
) {
  const specs = facts.specsDir ?? DEFAULT_SPECS_DIR;
  const tables = [`${specs}/decisions.md`, `${specs}/open-questions.md`];
  const implement = flowId ? [`.qfai/evidence/implement-${flowId}.md`] : [];
  const atdd = flowId
    ? [`.qfai/evidence/atdd-${flowId}.md`, `.qfai/evidence/coverage-depth-${flowId}.md`]
    : [];
  const sddEvidence = flowId ? [`.qfai/evidence/sdd-${flowId}.md`] : [];
  switch (workOrder.stageKind) {
    case "implement":
    case "regression_fix":
      return implement;
    case "test_fix":
      return workOrder.executor?.skill === "qfai-atdd" ? atdd : implement;
    case "acceptance":
      return atdd;
    case "sdd_append": {
      const seeding = facts.seeding;
      const contract = seeding?.contractFiles.length === 1 ? seeding.contractFiles : [];
      const example = seeding?.exampleFile ? [seeding.exampleFile] : [];
      return [...example, ...contract, `${specs}/decisions.md`, ...sddEvidence];
    }
    case "sdd":
    case "sdd_delta":
      return [...tables, ...sddEvidence];
    default:
      return [];
  }
}

// The base of every plan stage's work order: identity, executor, scope and history.
function baseWorkOrder(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  stage: PlanStage,
  facts: WorkflowFacts,
): WorkflowWorkOrder {
  const attempt = (snapshot.attempts?.[stage.stageInstanceId] ?? 0) + 1;
  const skill = executorSkill(stage, snapshot.diagnosis);
  const reviewerRoles = requiredReviewerRoles(skill, plan, facts);
  const actorHistory = snapshot.actorHistory ?? [];
  const receiptRefs = snapshot.receiptRefs ?? [];
  return {
    workOrderId: `work-order-${stage.stageInstanceId}-${attempt}`,
    stageInstanceId: stage.stageInstanceId,
    attempt,
    stageKind: stage.stageKind,
    ...(skill ? { executor: { skill } } : {}),
    ...(stage.operation ? { operation: stage.operation } : {}),
    ...(plan.writeScope
      ? { scope: scopeOf(plan.writeScope, allowedEffects(stage, snapshot)) }
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

// The target a stage's work order binds: none for the four untargeted kinds, the slot for a
// new story, and otherwise the run's one bound flow.
function withTarget(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
): WorkflowWorkOrder | WorkflowDecision {
  if (UNTARGETED_KINDS.includes(workOrder.stageKind)) return workOrder;
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

// SIMPLIFIED: a stage whose predicate does not hold is recorded as a receipt carrying
// `not_applicable` and the predicate as its reason, when `next` issues the stage after it.
// Lift when: the run evidence gains its own record of skipped stages.
function skippedBefore(
  plan: Plan,
  selected: PlanStages,
  lastAccepted: string | undefined,
  issuing: string,
): WorkflowEvent[] {
  const ids = plan.stages.map((stage) => stage.stageInstanceId);
  const from = lastAccepted === undefined ? 0 : ids.indexOf(lastAccepted) + 1;
  return plan.stages
    .slice(from, ids.indexOf(issuing))
    .filter((stage) => !selected.includes(stage))
    .map((stage) => ({
      type: "receipt-recorded",
      stageInstanceId: stage.stageInstanceId,
      notRun: { kind: "not_applicable", reason: `predicate ${stage.when ?? "none"} does not hold` },
    }));
}

export function issueWorkOrder(
  run: WorkflowRun,
  workOrder: WorkflowWorkOrder,
  skipped: WorkflowEvent[] = [],
  extras: Partial<WorkflowEvent> = {},
): WorkflowDecision {
  const events: WorkflowEvent[] = [
    ...skipped,
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
    executor: { skill: "qfai-implement" },
    operation: "seam-only",
    parentWorkOrderId: seam.parentWorkOrderId,
  });
}

// A routing receipt that no longer holds sends the run back to routing before any work.
function planRevision(snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  const ref = snapshot.routingReceiptRef;
  if (ref === undefined || facts.receiptValidity?.[ref] === "valid") return undefined;
  const run = { ...snapshot.run, state: "routing", sequence: snapshot.run.sequence + 1 };
  return { verdict: { ok: true, run }, events: [{ type: "required-plan-revision" }] };
}

// The stage `next` issues: a repair's owner, or the first selected stage not yet accepted.
// SIMPLIFIED: a repair goes to the plan stage the first finding's owner serves.
// Lift when: a repair owned by no plan stage returns the run to routing, and the detecting stage
// is reissued after the repair is accepted.
function stageToIssue(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  selected: PlanStages,
): { stage?: PlanStage | undefined; refused?: true } {
  const repairOwner = snapshot.repairRequest?.debts[0]?.resolvingOwner;
  if (!repairOwner) return { stage: selected[(snapshot.acceptedStages ?? []).length] };
  const stage = plan.stages.find((candidate) => candidate.skill === repairOwner);
  return stage ? { stage } : { refused: true };
}

// The work order for one plan stage, with its target, inputs, obligations and records.
function stageWorkOrder(
  snapshot: WorkflowSnapshot,
  plan: Plan,
  stage: PlanStage,
  selected: PlanStages,
  facts: WorkflowFacts,
): WorkflowDecision {
  const targeted = withTarget(snapshot, baseWorkOrder(snapshot, plan, stage, facts));
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
  const lastAccepted = (snapshot.acceptedStages ?? []).at(-1)?.stageInstanceId;
  const skipped = skippedBefore(plan, selected, lastAccepted, stage.stageInstanceId);
  return issueWorkOrder(snapshot.run, workOrder, skipped, {
    ...(obligationSet ? { obligationSet } : {}),
    ...(records ? { recordsAtIssue: records } : {}),
  });
}

// `next` on a run in `ready`: the next work order of the plan, or none once every stage is in.
export function issueNext(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run } = snapshot;
  const revision = planRevision(snapshot, facts);
  if (revision) return revision;
  const plan = snapshot.plan;
  if (!plan || planNotReady(snapshot, facts)) return refusedInput(run, "The plan is not ready.");
  if (snapshot.seamRequest) return issueSeamOnly(snapshot, snapshot.seamRequest);
  const selected = activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet);
  const next = stageToIssue(snapshot, plan, selected);
  if (next.refused) return refusedInput(run, "The repair work order is not ready.");
  if (!next.stage) return { verdict: { ok: true, run, workOrder: null }, events: [] };
  return stageWorkOrder(snapshot, plan, next.stage, selected, facts);
}
