import {
  areaCovers,
  authoredStage,
  firstMatchedKind,
  notReady,
  RESULT_ID,
  refusedWith,
  skillOwnerOf,
  STORY_AUTHORING_KINDS,
  type PlanStage,
} from "./common.js";
import { approvalIsStale, currentStory, reaskCreate } from "./issue.js";
import { carries, entriesOf, isModifier, withModifiers } from "./modifiers.js";
import { carriedAuthorization, parseMeasurement, parseQuestionInput } from "./parse.js";
import { DIAGNOSIS_VERDICTS } from "./payloadShapes.js";
import { storyTreeChecks } from "./records.js";
import { needsDiagnosis } from "./stages.js";
import { resolveBranch, REROUTE_CAP, revisionOf } from "./reroute.js";
import { rerouteQuestion } from "./routeDecision.js";
import {
  issuableSteps,
  repairOwnerOf,
  servingStage,
  servingSteps,
  skillToInvoke,
  stageSteps,
  stepNamesOf,
} from "./steps.js";
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
  WorkflowReroute,
  WorkflowResult,
  WorkflowRun,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

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

// A review reviews the output of the stage the result answers. Its reviewer is not independent
// when it is the result's own actor or the history records it as an author of that stage's
// output; having authored another stage of the run does not count.
function reviewerRefusals(result: WorkflowResult, actorHistory: readonly WorkflowActor[]) {
  return (result.reviewResults ?? []).flatMap((review, index): InputRefusal[] =>
    review.agentInstance === result.actor?.agentInstance ||
    authoredStage(actorHistory, review.agentInstance, result.stageInstanceId)
      ? [{ reason: "reviewer-not-independent", subject: `reviewResults[${index}]` }]
      : [],
  );
}

// A result that reports its stage accepted carries a PASS from each reviewer role the work order
// requires. A result that re-routes at a declared branch point hands its work on, and needs none.
// Who gave a PASS is checked by `reviewerRefusals`.
function missingReviewRefusals(
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
): InputRefusal[] {
  if (!isAccepted(result) || result.branch !== undefined) return [];
  const passed = new Set(
    (result.reviewResults ?? [])
      .filter((review) => review.verdict === "PASS")
      .map((review) => review.role),
  );
  return (workOrder.requiredReviewerRoles ?? [])
    .filter((role) => !passed.has(role))
    .map((role) => ({ reason: "review-missing", subject: role }));
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
  // A fix's receipts are what an accepted fix rests on; a fix that hands its finding on, waits
  // or stops has none to show.
  if (result.outcome !== "accepted" && result.outcome !== "accepted_with_debt") return refusals;
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

const EXAMPLE_FILE = /(^|\/)03_Example\.md$/;

// Whether a pass-through step's own check shows work it owns remains. A step with no such check
// is judged by the stage's reviewers.
function passObligationOpen(
  step: string,
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): boolean {
  const kind = firstMatchedKind(snapshot.diagnosis);
  switch (step) {
    case "atdd-author":
      return facts.acceptanceObligationsUnmet === true;
    // An example states the diagnosed case only when the diagnosis matched one first, and a
    // story-authoring stage that passes the step changes no example.
    case "sdd-story":
      return workOrder.stageKind === "sdd_append"
        ? kind !== "EX"
        : (result.changedFiles ?? []).some((file) => EXAMPLE_FILE.test(file.path));
    // A BF or an AC names the acceptance layer, and an EX the example layer.
    case "atdd-test-fix":
      return kind === "BF" || kind === "AC";
    case "implement-test-fix":
      return kind === "EX";
    // A route that changes compatibility always has a migration and a breaking change to state.
    case "verify-change-note":
      return snapshot.plan?.route === "change-compatibility";
    default:
      return false;
  }
}

// A pass stands only for a step its work order marks pass-through, and only while nothing the
// step owns remains.
function passRefusals(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  return (result.passes ?? []).flatMap((pass): InputRefusal[] => {
    const step = workOrder.steps?.find((each) => each.name === pass.step);
    if (!step?.passThrough) return [{ reason: "pass-not-allowed", subject: pass.step }];
    return passObligationOpen(pass.step, snapshot, result, workOrder, facts)
      ? [{ reason: "pass-obligation-open", subject: pass.step }]
      : [];
  });
}

function isAccepted(result: WorkflowResult): boolean {
  return result.outcome === "accepted" || result.outcome === "accepted_with_debt";
}

// A result that runs `triage-close` and is accepted says how it closed the request, unless it
// re-routes the request instead, and no other result does.
function closureRefusals(result: WorkflowResult, workOrder: WorkflowWorkOrder): InputRefusal[] {
  const closes = stepNamesOf(workOrder).includes("triage-close");
  const wanted = closes && isAccepted(result) && result.branch === undefined;
  return wanted === (result.closure !== undefined)
    ? []
    : [{ reason: "schema", subject: "closure" }];
}

const DECISION_ROW = /\bDEC-\d{4}(?:-\d{4})?\b/g;

// A step at a user decision point under `gate:user` puts its decision to the operator: it takes
// the decision itself only where the request's upstream record already made it, a
// `decisions.md` row in force that its reason cites. A cited row that is missing or not in force
// answers nothing, whether or not `gate:user` holds.
function adoptedRefusals(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  const gated = carries(snapshot, "gate:user");
  const upstream = snapshot.extraction?.entryFlags.includes("upstream") === true;
  const inForce = (id: string) =>
    (facts.decisionRows ?? []).some((row) => row.rowId === id && row.inForce);
  return (result.adopted ?? []).flatMap((entry, index): InputRefusal[] => {
    const step = workOrder.steps?.find((each) => each.name === entry.step);
    if (step?.decisionPoint !== "user") return [];
    const cited = entry.reason.match(DECISION_ROW) ?? [];
    const answered = upstream && cited.length > 0 && cited.every(inForce);
    const unanswered = upstream && cited.some((id) => !inForce(id));
    return unanswered || (gated && !answered)
      ? [{ reason: "decision-unasked", subject: `adopted[${index}]` }]
      : [];
  });
}

// A result may raise only a modifier of the closed set.
function raiseRefusals(result: WorkflowResult): InputRefusal[] {
  return (result.raise ?? []).flatMap((entry, index): InputRefusal[] =>
    isModifier(entry.modifier) ? [] : [{ reason: "schema", subject: `raise[${index}]` }],
  );
}

export function resultRefusals(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): InputRefusal[] {
  const refusals: InputRefusal[] = [
    ...adoptedRefusals(snapshot, result, workOrder, facts),
    ...raiseRefusals(result),
    ...reviewerRefusals(result, snapshot.actorHistory ?? []),
    ...missingReviewRefusals(result, workOrder),
    ...digestRefusals(result, facts),
    ...measurementRefusals(result),
    ...blockedRefusals(snapshot, result, workOrder, facts),
    ...scopeRefusals(result, workOrder, facts),
    ...passRefusals(snapshot, result, workOrder, facts),
    ...closureRefusals(result, workOrder),
  ];
  const branch = resolveBranch(snapshot, workOrder, result, facts).refusal;
  if (branch) refusals.push(branch);
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

// SIMPLIFIED: the replan budget is checked on `next`'s plan revision only; an answer that changes
// the scope replans from `awaiting_input` unchecked, since the state machine gives that state no
// edge to `blocked`.
// Lift when: the state machine names the edge a replan at its cap takes from `awaiting_input`.

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

// The outstanding work order's stage when it repairs a finding another stage detected, and the
// steps that serve the finding's owner there.
function repairStageOf(snapshot: WorkflowSnapshot, selected: readonly PlanStage[]) {
  const { repairRequest: request, outstandingWorkOrder: workOrder, plan } = snapshot;
  const owner = repairOwnerOf(snapshot);
  if (!request || !workOrder || !plan || !owner) return undefined;
  if (workOrder.stageInstanceId === request.stageInstanceId) return undefined;
  const stage = selected.find((each) => each.stageInstanceId === workOrder.stageInstanceId);
  if (!stage) return undefined;
  return { stage, steps: servingSteps(stage, owner) };
}

// Whether the result names the plan stage the run is at, with the fields that stage needs.
function stageResultIsBroken(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  stage: PlanStage,
  result: WorkflowResult,
  steps: string[],
): boolean {
  const flowTarget = workOrder.target?.kind === "flow" ? workOrder.target.flowId : undefined;
  const diagnosis = result.diagnosis;
  return (
    workOrder.stageInstanceId !== stage.stageInstanceId ||
    workOrder.stageKind !== stage.stageKind ||
    stepNamesOf(workOrder).join(",") !== steps.join(",") ||
    (flowTarget !== undefined && flowTarget !== snapshot.flowBinding?.flowId) ||
    (needsDiagnosis({ ...stage, steps: stageSteps(stage).filter((s) => steps.includes(s.name)) }) &&
      (!diagnosis ||
        !DIAGNOSIS_VERDICTS.some((verdict) => verdict === diagnosis.verdict) ||
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
  type: string,
  extras: Partial<WorkflowEvent>,
): WorkflowEvent[] {
  return [
    {
      type,
      resultRef: `results/${result.resultId}.json`,
      stageInstanceId: workOrder.stageInstanceId,
      outcome: result.outcome,
      ...(result.notRun ? { notRun: result.notRun } : {}),
      ...(result.passes?.length ? { passes: result.passes } : {}),
      ...(result.adopted?.length ? { adopted: result.adopted } : {}),
      ...(result.closure ? { closure: result.closure } : {}),
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

// A finding whose owner no stage of the route serves blocks the run: the run never leaves its
// route for it. The halt names the findings and the skill to invoke by name for the first.
function unservedHalt(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
): WorkflowHalt | undefined {
  const plan = snapshot.plan;
  if (result.outcome !== "needs_repair" || !plan) return undefined;
  const unserved = (result.debts ?? []).filter((debt) => {
    const owner = skillOwnerOf(debt);
    return owner !== undefined && !servingStage(plan.stages, owner);
  });
  const owner = unserved.map(skillOwnerOf).find(Boolean);
  if (owner === undefined) return undefined;
  return {
    blocker: "stage-blocked",
    owner: skillToInvoke(owner),
    subjects: unserved.map((debt) => `${debt.findingCode}@${debt.path}`),
  };
}

// A repair the budget no longer allows is `blocked`, never a pass.
function budgetHalt(snapshot: WorkflowSnapshot, result: WorkflowResult): WorkflowHalt | undefined {
  const exhausted = exhaustedRepairCauses(snapshot, result);
  if (exhausted.length === 0) return undefined;
  return { blocker: "budget-exhausted", owner: "operator", subjects: exhausted };
}

// A re-route a declared branch point reports moves the run to routing with its destination
// fixed. Past the cap it opens one question instead, and the run waits on the operator.
function rerouted(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  reroute: WorkflowReroute,
  facts: WorkflowFacts,
  extras: Partial<WorkflowEvent>,
): WorkflowDecision {
  const { run } = snapshot;
  if ((snapshot.reroutes ?? []).length < REROUTE_CAP) {
    const events = acceptedEvents(workOrder, result, "declared-reroute", { ...extras, reroute });
    const routing = { ...run, state: "routing", sequence: run.sequence + events.length };
    return { verdict: { ok: true, run: routing }, events };
  }
  const destination = facts.plans?.[reroute.route];
  const stages = (destination?.stages ?? []).map((stage) => stage.stageInstanceId);
  const question = rerouteQuestion(`question-${run.sequence + 1}-1`, destination?.family, stages);
  const events: WorkflowEvent[] = [
    ...acceptedEvents(workOrder, result, "reroute-asked", { ...extras, reroute }),
    { type: "question-opened", question },
    { type: "material-decision" },
  ];
  const waiting = { ...run, state: "awaiting_input", sequence: run.sequence + events.length };
  return { verdict: { ok: true, run: waiting, questions: [question] }, events };
}

// The transition of a result the run can take: a block, a re-route, or the stage accepted.
function settleAccepted(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  facts: WorkflowFacts,
  extras: Partial<WorkflowEvent>,
): WorkflowDecision {
  const { run } = snapshot;
  const halt = budgetHalt(snapshot, result) ?? unservedHalt(snapshot, result);
  if (halt) return blockOnResult(run, result, undefined, halt, extras);
  const reroute = isAccepted(result)
    ? resolveBranch(snapshot, workOrder, result, facts).reroute
    : undefined;
  if (reroute) return rerouted(snapshot, workOrder, result, reroute, facts, extras);
  const events = acceptedEvents(workOrder, result, "accept-nonfinal-result", extras);
  return {
    verdict: { ok: true, run: { ...run, state: "ready", sequence: run.sequence + events.length } },
    events,
  };
}

// The transition a checked result takes: a wait, a block, a new approval, a re-route, or the
// stage accepted.
function settleResult(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  result: WorkflowResult,
  facts: WorkflowFacts,
  extras: Partial<WorkflowEvent>,
): WorkflowDecision {
  const { run } = snapshot;
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
  return settleAccepted(snapshot, workOrder, result, facts, extras);
}

// `accept` of a plan stage's result on a run in `running`.
export function acceptStageResult(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run, plan, outstandingWorkOrder: workOrder } = snapshot;
  const accepted = snapshot.acceptedStages ?? [];
  const selected = plan?.stages ?? [];
  // A repair stage is one of the plan's own, issued out of order to the finding's owner.
  const repair = repairStageOf(snapshot, selected);
  const stage = repair?.stage ?? selected[accepted.length];
  if (!plan || !workOrder || !stage) return notReady(run, "stage result");
  const steps = (repair?.steps ?? issuableSteps(snapshot, stage)).map((step) => step.name);
  if (stageResultIsBroken(snapshot, workOrder, stage, result, steps)) {
    return notReady(run, "stage result");
  }
  const storyTree = storyTreeChecks(snapshot, workOrder, result, facts);
  const refusals = [...resultRefusals(snapshot, result, workOrder, facts), ...storyTree.refusals];
  if (refusals.length > 0) return refusedWith(run, refusals);
  const revision = revisionOf(facts);
  const extras = { ...storyTree.extras, ...(revision ? { revision } : {}) };
  return withRaised(snapshot, result, settleResult(snapshot, workOrder, result, facts, extras));
}

// A result that raises a modifier the run does not carry yet adds it, whatever its outcome: the
// core appends `modifier-raised` before the result's own transition. Nothing lowers one.
function withRaised(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  decision: WorkflowDecision,
): WorkflowDecision {
  const held = snapshot.modifiers ?? [];
  const raised = (result.raise ?? []).flatMap((entry) =>
    isModifier(entry.modifier)
      ? entriesOf([entry.modifier], "raised").map((each) => ({ ...each, reason: entry.reason }))
      : [],
  );
  const added = withModifiers(held, raised).slice(held.length);
  const run = decision.verdict.run;
  if (!decision.verdict.ok || added.length === 0 || !run) return decision;
  return {
    verdict: { ...decision.verdict, run: { ...run, sequence: run.sequence + 1 } },
    events: [{ type: "modifier-raised", modifiers: added }, ...decision.events],
  };
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
