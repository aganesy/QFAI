import {
  areaCovers,
  executorSkill,
  isAuthorOrRecommender,
  notReady,
  RESULT_ID,
  refusedWith,
  servingStage,
  skillOwnerOf,
  stageSkills,
  STORY_AUTHORING_KINDS,
  type PlanStage,
} from "./common.js";
import { approvalIsStale, currentStory, reaskCreate } from "./issue.js";
import { isRecord, parseMeasurement, parseQuestionInput } from "./parse.js";
import { storyTreeChecks } from "./records.js";
import { activeStages } from "./stages.js";
import type {
  InputRefusal,
  InputRefusalReason,
  WorkflowActor,
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowGateReceipt,
  WorkflowHalt,
  WorkflowNotRun,
  WorkflowQuestion,
  WorkflowResult,
  WorkflowRun,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

const AUTHORIZATION_KINDS: unknown[] = ["request_scope", "human_decision", "project_policy"];

// Only the core records an authorization. One a payload carries is refused, and one of a kind
// the core never records, such as one derived from a mode or a confidence value, says so.
export function carriedAuthorization(payload: { approved?: unknown; authorization?: unknown }) {
  const refusals: InputRefusal[] = [];
  const { approved, authorization } = payload;
  if (approved !== undefined) refusals.push({ reason: "schema", subject: "approved" });
  if (authorization !== undefined) {
    const kind = isRecord(authorization) ? authorization.kind : undefined;
    const reason = AUTHORIZATION_KINDS.includes(kind) ? "schema" : "authorization-kind";
    refusals.push({ reason, subject: "authorization" });
  }
  return refusals;
}

// The checks every `accept` runs before it reads what the result says.
export function acceptPreamble(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
): WorkflowDecision | undefined {
  const { run, outstandingWorkOrder: workOrder } = snapshot;
  if (snapshot.recordedResults?.[result.resultId]) {
    return refusedWith(run, [{ reason: "result-id-reused", subject: "resultId" }]);
  }
  if (!RESULT_ID.test(result.resultId)) {
    return refusedWith(run, [{ reason: "schema", subject: "resultId" }]);
  }
  const carried = carriedAuthorization(result);
  if (carried.length > 0) return refusedWith(run, carried);
  // The sequence is checked before the payload: a result prepared against an earlier state is
  // stale whatever it names.
  if (result.expectedSequence !== run.sequence) {
    const message =
      "The run moved on since this result was prepared. Read the run's status and submit again.";
    return { verdict: { ok: false, run, error: { code: "stale-sequence", message } }, events: [] };
  }
  if (
    result.workOrderId !== workOrder?.workOrderId ||
    result.stageInstanceId !== workOrder.stageInstanceId ||
    result.attempt !== workOrder.attempt
  ) {
    return refusedWith(run, [{ reason: "work-order", subject: "workOrderId" }]);
  }
  return undefined;
}

function notRunRefusalOf(
  notRun: WorkflowNotRun | undefined,
  facts: WorkflowFacts,
): InputRefusalReason | undefined {
  if (notRun?.kind === "not_applicable" && !notRun.reason?.trim()) return "skip-unexplained";
  if (notRun?.kind === "reused" && facts.receiptValidity?.[notRun.receiptRef] !== "valid") {
    return "reuse-stale";
  }
  return undefined;
}

// SIMPLIFIED: a reviewer recorded as an author or recommender anywhere in the run is refused.
// Lift when: a review result names the stage it reviewed.
function reviewerRefusals(result: WorkflowResult, actorHistory: readonly WorkflowActor[]) {
  return (result.reviewResults ?? []).flatMap((review, index): InputRefusal[] =>
    isAuthorOrRecommender(actorHistory, review.agentInstance)
      ? [{ reason: "reviewer-not-independent", subject: `reviewResults[${index}]` }]
      : [],
  );
}

// SIMPLIFIED: a submitted digest of a file the facts carry no digest for is not checked.
// Lift when: the command adapter supplies the digest of every file a result names.
function digestRefusals(result: WorkflowResult, facts: WorkflowFacts): InputRefusal[] {
  return (result.changedFiles ?? [])
    .filter((changed) => {
      const own = facts.fileDigests?.[changed.path];
      return own !== undefined && own !== changed.digest;
    })
    .map((changed) => ({ reason: "digest-mismatch", subject: changed.path }));
}

function measurementRefusals(result: WorkflowResult): InputRefusal[] {
  if (result.measurement === undefined) return [];
  const measured = parseMeasurement(result.measurement);
  return measured.ok ? [] : measured.subjects.map((subject) => ({ reason: "schema", subject }));
}

// A blocked result may list only findings the run cannot repair itself: one outside the checked
// write scope, or one inside it that only the operator can clear, owned by a flow that exists
// and, inside the scope, by the bound flow. A run that binds no flow names no owning flow. The
// bound flow is the run's, since a verify or maintenance work order carries no target.
function blockedRefusals(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  if (result.outcome !== "blocked") return [];
  const scope = workOrder.scope?.writeAreas ?? [];
  const boundFlow = snapshot.flowBinding?.flowId;
  return (result.debts ?? []).flatMap((debt, index): InputRefusal[] => {
    const inside = scope.some((area) => areaCovers(area, debt.path));
    const skillOwned = Boolean(debt.resolvingOwner?.trim()) && debt.resolvingOwner !== "operator";
    const owningFlow = debt.owningFlow ?? undefined;
    const flowHolds =
      owningFlow === undefined ? boundFlow === undefined : (facts.flows ?? []).includes(owningFlow);
    const repairable = (inside && (skillOwned || owningFlow !== boundFlow)) || !flowHolds;
    return repairable ? [{ reason: "blocked-repairable", subject: `debts[${index}]` }] : [];
  });
}

// Each changed path must lie in the work order's write areas or its own records; a binding
// must name the work order's own slot.
function scopeRefusals(
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  const refusals: InputRefusal[] = [];
  const areas = [...(workOrder.scope?.writeAreas ?? []), ...(workOrder.recordAreas ?? [])];
  const target = workOrder.target;
  (result.bindings ?? []).forEach((binding, index) => {
    if (target?.kind !== "new_story" || binding.slotId !== target.slotId) {
      refusals.push({ reason: "unbound-story", subject: `bindings[${index}]` });
    }
  });
  for (const changed of result.changedFiles ?? []) {
    const real = facts.changedRealPaths?.[changed.path];
    const judged = real === undefined ? changed.path : real;
    if (judged === null || !areas.some((area) => areaCovers(area, judged))) {
      refusals.push({ reason: "write-scope", subject: changed.path });
    }
  }
  return refusals;
}

// The receipts a stage kind cannot be accepted without, and what a test observation needs.
function receiptRefusals(result: WorkflowResult, workOrder: WorkflowWorkOrder): InputRefusal[] {
  const refusals: InputRefusal[] = [];
  if (result.testObservation === "expected_red" && result.red?.failureKind !== "assertion") {
    refusals.push({ reason: "red-not-assertion", subject: "red" });
  }
  const fix = result.regressionFix;
  if (workOrder.stageKind === "regression_fix" && (!fix?.rerunRef || !fix.reviewRef)) {
    refusals.push({ reason: "regression-fix-receipt", subject: "regressionFix" });
  }
  const testFix = result.testFix;
  if (workOrder.stageKind === "test_fix" && (!testFix?.reviewRef || !testFix.rerunRef)) {
    refusals.push({ reason: "test-fix-receipt", subject: "testFix" });
  }
  // A changed expectation is a change of meaning, which the fix leaves to story authoring.
  if (
    workOrder.stageKind === "test_fix" &&
    JSON.stringify(testFix?.citedAfter) !== JSON.stringify(testFix?.citedBefore)
  ) {
    refusals.push({ reason: "test-fix-meaning", subject: "testFix" });
  }
  return refusals;
}

export function resultRefusals(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  const refusals: InputRefusal[] = [
    ...reviewerRefusals(result, snapshot.actorHistory ?? []),
    ...digestRefusals(result, facts),
    ...measurementRefusals(result),
    ...blockedRefusals(snapshot, result, workOrder, facts),
    ...scopeRefusals(result, workOrder, facts),
  ];
  const notRun = notRunRefusalOf(result.notRun, facts);
  if (notRun) refusals.push({ reason: notRun, subject: "notRun" });
  refusals.push(...receiptRefusals(result, workOrder));
  (result.debts ?? []).forEach((debt, index) => {
    if (!debt.resolvingOwner?.trim()) {
      refusals.push({ reason: "debt-owner-missing", subject: `debts[${index}]` });
    }
  });
  return refusals;
}

// A blocked result names its blocker from the findings it lists: `scope-dependency` when any
// lies outside the checked write scope, `stage-blocked` otherwise. Their shared resolving owner
// clears it, or the operator when they differ or none is listed.
function blockedHalt(result: WorkflowResult, workOrder: WorkflowWorkOrder): WorkflowHalt {
  const scope = workOrder.scope?.writeAreas ?? [];
  const debts = result.debts ?? [];
  const outside = debts.some((debt) => !scope.some((area) => areaCovers(area, debt.path)));
  const owners = [...new Set(debts.map((debt) => debt.resolvingOwner))];
  const shared = owners.length === 1 ? owners[0] : undefined;
  return {
    blocker: outside ? "scope-dependency" : "stage-blocked",
    owner: shared ?? "operator",
    subjects: debts.map((debt) => `${debt.findingCode}@${debt.path}`),
  };
}

// SIMPLIFIED: an unrun result with no delegation blocks the run without naming a blocker or who
// can clear it.
// Lift when: the contract names the blocker an unrun result gives.
export function blockOnResult(
  run: WorkflowRun,
  result: WorkflowResult,
  type = "unrun-or-unresolved-dependency",
  halt?: WorkflowHalt,
  extras: Partial<WorkflowEvent> = {},
): WorkflowDecision {
  const blocked = { ...run, state: "blocked", sequence: run.sequence + 1 };
  return {
    verdict: { ok: true, run: blocked, ...(halt ? { halt } : {}) },
    events: [
      {
        type,
        resultRef: `results/${result.resultId}.json`,
        stageInstanceId: result.stageInstanceId,
        outcome: result.outcome,
        ...(halt ? { halt } : {}),
        ...extras,
      },
    ],
  };
}

// SIMPLIFIED: the replan budget is checked on a replan from `running` only; the state machine
// gives `ready` and `awaiting_input` no edge to `blocked`.
// Lift when: the state machine names the edge a replan at its cap takes from those states.
const REPLAN_BUDGET = 3;

const REPAIR_BUDGET = 3;

// Each cause a repair request lists that has had every automatic repair its budget allows,
// named `<findingCode>@<path>`.
function exhaustedRepairCauses(snapshot: WorkflowSnapshot, result: WorkflowResult): string[] {
  if (result.outcome !== "needs_repair") return [];
  const made = snapshot.repairsByCause ?? [];
  return (result.debts ?? [])
    .filter((debt) =>
      made.some(
        (cause) =>
          cause.findingCode === debt.findingCode &&
          cause.path === debt.path &&
          cause.count >= REPAIR_BUDGET,
      ),
    )
    .map((debt) => `${debt.findingCode}@${debt.path}`);
}

// The core never sleeps: each retry is returned with the delay the harness waits before it.
const RETRY_DELAYS_SECONDS = [30, 60, 120];

// A result reporting its delegation failed is decided by that delegation, before anything the
// result lists.
function decideDelegation(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
): WorkflowDecision | undefined {
  const { run } = snapshot;
  const status = result.delegation?.status;
  if (status === "unavailable") {
    const subjects = ["delegateSubAgent"];
    // SIMPLIFIED: every plan stage is taken to need a real delegation, so the first delegation
    // is the one of a run with no accepted stage.
    // Lift when: a plan or work order marks which stages need a real delegation.
    const first = (snapshot.acceptedStages ?? []).length === 0;
    const halt: WorkflowHalt = first
      ? { cause: "unsupported-capability", owner: "operator", subjects }
      : { blocker: "delegation-unavailable", owner: "operator", subjects };
    return blockOnResult(run, result, undefined, halt);
  }
  if (status !== "saturated") return undefined;
  const nextDelaySeconds = RETRY_DELAYS_SECONDS[snapshot.delegationRetries ?? 0];
  if (nextDelaySeconds === undefined) {
    const halt = { blocker: "budget-exhausted" as const, owner: "operator" };
    return blockOnResult(run, result, undefined, { ...halt, subjects: [workOrder.workOrderId] });
  }
  const retry = { attempt: workOrder.attempt + 1, nextDelaySeconds };
  const kept = { ...workOrder, attempt: retry.attempt };
  const event = {
    type: "retry-scheduled",
    resultRef: `results/${result.resultId}.json`,
    workOrder: kept,
    retry,
  };
  const next = { ...run, sequence: run.sequence + 1 };
  return { verdict: { ok: true, run: next, workOrder: kept, retry }, events: [event] };
}

// A stage that needs an answer before it can go on opens its questions and waits. A question a
// story-authoring stage opens asks for its change, and its answer authorizes that change.
function openStageQuestions(
  run: WorkflowRun,
  result: WorkflowResult,
  storyAuthoring: boolean,
  extras: Partial<WorkflowEvent>,
): WorkflowDecision {
  const inputs = (result.questions ?? []).map(parseQuestionInput);
  const parsed = inputs.flatMap((question) => question ?? []);
  if (parsed.length !== inputs.length) {
    return refusedWith(run, [{ reason: "schema", subject: "questions" }]);
  }
  const questions: WorkflowQuestion[] = parsed.map((question, index) => ({
    ...question,
    questionId: `question-${run.sequence + 1}-${index + 1}`,
    ...(storyAuthoring && question.kind === "decision" ? { changeRequest: true as const } : {}),
  }));
  const events: WorkflowEvent[] = [
    ...questions.map((question) => ({ type: "question-opened", question })),
    {
      type: "material-decision",
      resultRef: `results/${result.resultId}.json`,
      stageInstanceId: result.stageInstanceId,
      outcome: result.outcome,
      ...extras,
    },
  ];
  const waiting = { ...run, state: "awaiting_input", sequence: run.sequence + events.length };
  return { verdict: { ok: true, run: waiting, questions }, events };
}

function outcomeIsAcceptable(result: WorkflowResult, stageKind: string): boolean {
  switch (result.outcome) {
    case "accepted":
    case "accepted_with_debt":
    case "unrun":
    case "blocked":
      return true;
    case "awaiting_input":
      return (result.questions ?? []).length > 0;
    case "needs_repair":
      return (
        (stageKind === "acceptance" && result.seamRequest !== undefined) ||
        (result.debts ?? []).length > 0
      );
    default:
      return false;
  }
}

const DIAGNOSIS_VERDICTS = ["missing-test", "defective-test", "regression", "expectation-differs"];

// Whether the result names the plan stage the run is at, with the fields that stage needs.
// The outstanding work order's stage when it repairs a finding another stage detected, and the
// owner it was issued to.
function repairStageOf(snapshot: WorkflowSnapshot, selected: readonly PlanStage[]) {
  const request = snapshot.repairRequest;
  const workOrder = snapshot.outstandingWorkOrder;
  if (!request || !workOrder || workOrder.stageInstanceId === request.stageInstanceId) {
    return undefined;
  }
  const stage = selected.find((each) => each.stageInstanceId === workOrder.stageInstanceId);
  const executor = workOrder.executor?.skill;
  if (!stage || !executor || !stageSkills(stage, snapshot.diagnosis).includes(executor)) {
    return undefined;
  }
  return { stage, executor };
}

function stageResultIsBroken(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  stage: PlanStage,
  result: WorkflowResult,
  executor = executorSkill(stage, snapshot.diagnosis),
): boolean {
  const flowTarget = workOrder.target?.kind === "flow" ? workOrder.target.flowId : undefined;
  const diagnosis = result.diagnosis;
  return (
    workOrder.stageInstanceId !== stage.stageInstanceId ||
    workOrder.stageKind !== stage.stageKind ||
    workOrder.executor?.skill !== executor ||
    workOrder.operation !== stage.operation ||
    (flowTarget !== undefined && flowTarget !== snapshot.flowBinding?.flowId) ||
    (stage.stageKind === "diagnose" &&
      (!diagnosis ||
        !DIAGNOSIS_VERDICTS.includes(diagnosis.verdict) ||
        !diagnosis.reproductionRef ||
        !Array.isArray(diagnosis.matchedIds))) ||
    !outcomeIsAcceptable(result, stage.stageKind) ||
    result.proposal !== undefined
  );
}

// A gate verdict a result submits is informative only; the core never decides a gate from it.
function agentReported(claims: { gateId: string; verdict: string }[]): WorkflowGateReceipt[] {
  return claims.map(({ gateId, verdict }) => ({ gateId, verdict, trustLevel: "agent_reported" }));
}

// The measurement a result submitted, kept as submitted: a `null` never becomes `0`.
function measuredOf(result: WorkflowResult) {
  const measured = parseMeasurement(result.measurement);
  return measured.ok ? { measurement: measured.measurement } : {};
}

// The events of an accepted result: the transition, and a binding per slot the story-authoring
// stage bound.
function acceptedEvents(
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  needsReplan: boolean,
  extras: Partial<WorkflowEvent>,
): WorkflowEvent[] {
  return [
    {
      type: needsReplan ? "scope-or-obligation-revision" : "accept-nonfinal-result",
      resultRef: `results/${result.resultId}.json`,
      stageInstanceId: workOrder.stageInstanceId,
      outcome: result.outcome,
      ...(result.notRun ? { notRun: result.notRun } : {}),
      ...(result.seamRequest ? { seamRequest: result.seamRequest } : {}),
      ...(result.diagnosis ? { diagnosis: result.diagnosis } : {}),
      ...(result.outcome === "needs_repair" && result.debts ? { repairs: result.debts } : {}),
      ...(result.outcome === "accepted_with_debt" && result.debts ? { debts: result.debts } : {}),
      ...(result.gateResults?.length ? { gateResults: agentReported(result.gateResults) } : {}),
      ...measuredOf(result),
      ...extras,
    },
    ...(workOrder.stageKind === "sdd" ? (result.bindings ?? []) : []).map((binding) => ({
      type: "binding-recorded",
      binding,
    })),
  ];
}

// A repair needs a new plan when a finding's owner is a skill no active stage of the plan serves.
function repairOutsidePlan(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
): boolean {
  const plan = snapshot.plan;
  if (result.outcome !== "needs_repair" || !plan) return false;
  const selected = activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet);
  return (result.debts ?? []).some((debt) => {
    const owner = skillOwnerOf(debt);
    return owner !== undefined && !servingStage(selected, owner, snapshot.diagnosis);
  });
}

// The run cannot go on past this result: a budget reached is `blocked`, never a pass.
function budgetHalt(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  needsReplan: boolean,
): WorkflowDecision | undefined {
  const halt = { blocker: "budget-exhausted" as const, owner: "operator" };
  if (needsReplan && (snapshot.replans ?? 0) >= REPLAN_BUDGET) {
    return blockOnResult(snapshot.run, result, undefined, { ...halt, subjects: ["replan"] });
  }
  const exhausted = exhaustedRepairCauses(snapshot, result);
  if (exhausted.length === 0) return undefined;
  return blockOnResult(snapshot.run, result, undefined, { ...halt, subjects: exhausted });
}

// The transition a checked result takes: a wait, a block, a new approval, or the stage accepted.
function settleResult(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  checked: { extras: Partial<WorkflowEvent>; facts: WorkflowFacts; lastOfPlan: boolean },
): WorkflowDecision {
  const { extras, facts, lastOfPlan } = checked;
  const { run, plan } = snapshot;
  const delegated = decideDelegation(snapshot, workOrder, result);
  if (delegated) return delegated;
  // Rows a story-authoring result appended are the run's whatever the result's outcome.
  if (result.outcome === "blocked") {
    return blockOnResult(run, result, undefined, blockedHalt(result, workOrder), extras);
  }
  if (result.outcome === "unrun") return blockOnResult(run, result, undefined, undefined, extras);
  if (result.outcome === "awaiting_input") {
    const storyAuthoring = STORY_AUTHORING_KINDS.includes(workOrder.stageKind);
    return openStageQuestions(run, result, storyAuthoring, extras);
  }
  const story = snapshot.approval?.target?.story;
  if (workOrder.target?.kind === "new_story" && story && approvalIsStale(snapshot)) {
    return reaskCreate(
      run,
      currentStory(snapshot) ?? { ...story, slotId: workOrder.target.slotId },
    );
  }
  const needsReplan =
    (plan?.route === "discovery" && lastOfPlan) ||
    (workOrder.stageKind === "diagnose" && result.diagnosis?.verdict === "expectation-differs") ||
    repairOutsidePlan(snapshot, result, facts);
  const halted = budgetHalt(snapshot, result, needsReplan);
  if (halted) return halted;
  const events = acceptedEvents(workOrder, result, needsReplan, extras);
  const state = needsReplan ? "routing" : "ready";
  return {
    verdict: { ok: true, run: { ...run, state, sequence: run.sequence + events.length } },
    events,
  };
}

// `accept` of a plan stage's result on a run in `running`.
export function acceptStageResult(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run, plan, outstandingWorkOrder: workOrder } = snapshot;
  const accepted = snapshot.acceptedStages ?? [];
  const selected = plan
    ? activeStages(plan, snapshot.diagnosis, facts.acceptanceObligationsUnmet)
    : [];
  // A repair stage is one of the plan's own, issued out of order to the finding's owner.
  const repair = repairStageOf(snapshot, selected);
  const stage = repair?.stage ?? selected[accepted.length];
  if (
    !plan ||
    !workOrder ||
    !stage ||
    stageResultIsBroken(snapshot, workOrder, stage, result, repair?.executor)
  ) {
    return notReady(run, "stage result");
  }
  const storyTree = storyTreeChecks(snapshot, workOrder, result, facts);
  const refusals = [...resultRefusals(snapshot, result, workOrder, facts), ...storyTree.refusals];
  if (refusals.length > 0) return refusedWith(run, refusals);
  const lastOfPlan = !repair && accepted.length + 1 === selected.length;
  return settleResult(snapshot, workOrder, result, { extras: storyTree.extras, facts, lastOfPlan });
}

// A seam-only result closes its seam request and returns the run to the acceptance stage it
// came from; one that already passes the target assertion is refused.
export function acceptSeamOnly(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
): WorkflowDecision {
  const { run, seamRequest } = snapshot;
  if (
    !seamRequest ||
    workOrder.parentWorkOrderId !== seamRequest.parentWorkOrderId ||
    result.outcome !== "accepted" ||
    result.seam?.targetTestId !== seamRequest.targetTestId
  ) {
    return notReady(run, "stage result");
  }
  if (result.seam.observation === "pass") {
    return refusedWith(run, [{ reason: "seam-passed", subject: "seam" }]);
  }
  const event = {
    type: "accept-nonfinal-result",
    resultRef: `results/${result.resultId}.json`,
    stageInstanceId: workOrder.stageInstanceId,
    outcome: result.outcome,
  };
  return {
    verdict: { ok: true, run: { ...run, state: "ready", sequence: run.sequence + 1 } },
    events: [event],
  };
}
