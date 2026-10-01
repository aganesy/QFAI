// `accept` of the routing work order's result: the core decides the route from the extraction,
// checks the proposal against it, and opens the questions routing needs before the first stage.

import { refusedWith } from "./common.js";
import { createQuestion } from "./issue.js";
import type { RouteChoice } from "./decisionRules.js";
import { carries, entriesOf } from "./modifiers.js";
import { parseQuestionInput } from "./parse.js";
import {
  admittedScope,
  checkedPlan,
  flowToBind,
  proposalRefusals,
  routingShapeIsBroken,
} from "./proposal.js";
import { reusedStepOf } from "./reroute.js";
import {
  candidateQuestion,
  defaultsIn,
  planQuestion,
  reroutedOutcome,
  routingOutcome,
  type RoutingOutcome,
} from "./routeDecision.js";
import { isWorkflowRoute } from "./routes.js";
import type {
  ProposalRefusal,
  ProposalRefusalReason,
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowPlan,
  WorkflowProposal,
  WorkflowQuestion,
  WorkflowResult,
  WorkflowRouteCandidate,
  WorkflowRun,
  WorkflowSettled,
  WorkflowSnapshot,
} from "./types.js";

type QuestionInput = NonNullable<ReturnType<typeof parseQuestionInput>>;

// What every routing decision records beside its questions.
interface Routed {
  snapshot: WorkflowSnapshot;
  run: WorkflowRun;
  proposal: WorkflowProposal;
  facts: WorkflowFacts;
  settled: WorkflowSettled;
  resultRef: string;
  inputs: QuestionInput[];
}

function routingNotReady(run: WorkflowRun): WorkflowDecision {
  const message = "The routing result is not ready. Check it and submit again.";
  return { verdict: { ok: false, run, error: { code: "invalid-input", message } }, events: [] };
}

// What satisfies each refusal reason, so a revising agent need not guess from the bare code.
const REFUSAL_FIXES: Record<ProposalRefusalReason, string> = {
  "unknown-path": "name a project-relative path that exists, with no glob",
  "unknown-id": "name a flow the story tree declares, and cite a contract by its file path",
  "protected-surface": "keep proposedWriteScope off the run's records and every protected target",
  "scope-escape":
    "use requestKind routed, and keep proposedWriteScope inside the project and what the route writes",
  "unresolved-approval": "open each risk signal that needs the operator as an unresolved question",
  "flow-binding":
    "name exactly one existing flow in affectedFlowIds; with new stories, name only the flows they join",
};

function proposalRefused(run: WorkflowRun, reasons: ProposalRefusal[]): WorkflowDecision {
  const fixes = [...new Set(reasons.map(({ reason }) => reason))].map(
    (reason) => `${reason}: ${REFUSAL_FIXES[reason]}.`,
  );
  const message = [
    "The route proposal failed a check. Revise it and submit it again.",
    ...fixes,
  ].join(" ");
  return {
    verdict: { ok: false, run, error: { code: "proposal-refused", message, reasons } },
    events: [],
  };
}

// One `create` question per new-story slot, then each unresolved question in its order, then the
// question routing itself asks: the plan confirmation or the candidate question.
function routingQuestions(
  routed: Routed,
  own: (questionId: string) => WorkflowQuestion | undefined,
): WorkflowQuestion[] {
  const { run, proposal, inputs } = routed;
  const idOf = (index: number) => `question-${run.sequence + 1}-${index + 1}`;
  const questions: WorkflowQuestion[] = proposal.newStories.map((story, index) =>
    createQuestion(idOf(index), {
      goal: story.goal,
      covers: story.covers,
      excludes: story.excludes,
      flowId: story.flowId,
      slotId: `slot-${run.sequence + 1}-${index + 1}`,
    }),
  );
  for (const input of inputs) questions.push({ ...input, questionId: idOf(questions.length) });
  const last = own(idOf(questions.length));
  return last ? [...questions, last] : questions;
}

function waitingOn(
  routed: Routed,
  questions: WorkflowQuestion[],
  before: WorkflowEvent[],
  after: WorkflowEvent,
  plan?: WorkflowPlan,
): WorkflowDecision {
  const events: WorkflowEvent[] = [
    ...before.filter((event) => event.type === "route-decided"),
    ...questions.map((question) => ({ type: "question-opened", question })),
    ...before.filter((event) => event.type !== "route-decided"),
    after,
  ];
  const run = {
    ...routed.run,
    state: "awaiting_input",
    sequence: routed.run.sequence + events.length,
  };
  return { verdict: { ok: true, run, questions, ...(plan ? { plan } : {}) }, events };
}

// Routing fixed one route: the plan is accepted, or waits on the questions routing opens, among
// them the plan confirmation `gate:user` asks for.
function fixedRoute(routed: Routed, outcome: RoutingOutcome, taken: RouteChoice): WorkflowDecision {
  const { run, proposal, facts, settled, resultRef } = routed;
  const { route, rule } = taken;
  const plan = checkedPlan(proposal, facts, route);
  const flowId = flowToBind(proposal, plan?.stages, facts).flowId;
  const decided: WorkflowEvent = {
    type: "route-decided",
    route,
    rule,
    extraction: proposal.extraction,
    modifiers: outcome.modifiers,
  };
  const before = [decided, ...(flowId ? [{ type: "binding-recorded", flowId }] : [])];
  // A re-route's destination starts with the step a receipt of the run may already satisfy.
  const reused =
    routed.snapshot.pendingReroute && plan
      ? reusedStepOf(routed.snapshot, plan.stages, facts)
      : undefined;
  const carried = reused ? { reused } : {};
  const confirm = carries(outcome, "gate:user");
  const questions = routingQuestions(routed, (id) =>
    confirm && plan ? planQuestion(id, plan) : undefined,
  );
  if (questions.length === 0) {
    if (!plan) return routingNotReady(run);
    const events = [...before, { type: "plan-accepted", plan, settled, resultRef, ...carried }];
    const ready = { ...run, state: "ready", sequence: run.sequence + events.length };
    return { verdict: { ok: true, run: ready, plan }, events };
  }
  const after = { type: "unsettled-material-input", proposal, settled, resultRef, ...carried };
  return waitingOn(routed, questions, before, after, plan);
}

// Routing that reads two ways and whose reading matters asks which route to take. Each candidate
// is kept with its plan; the answer fixes the route.
function candidateRouting(routed: Routed, outcome: RoutingOutcome): WorkflowDecision {
  const { run, proposal, facts, settled, resultRef } = routed;
  const candidates: WorkflowRouteCandidate[] = [];
  for (const choice of outcome.candidates) {
    const checked = checkedPlan(proposal, facts, choice.route);
    if (!checked) return routingNotReady(run);
    const plan = { ...checked, writeScope: admittedScope(proposal, checked.stages, facts) };
    const flowId = flowToBind(proposal, plan.stages, facts).flowId;
    const defaults = entriesOf(defaultsIn(facts.plans)(choice.route), "default");
    candidates.push({ ...choice, plan, modifiers: defaults, ...(flowId ? { flowId } : {}) });
  }
  const familyOf = (route: string) => facts.plans?.[route]?.family;
  const questions = routingQuestions(routed, (id) =>
    candidateQuestion(id, candidates, familyOf, outcome.recommended),
  );
  const after: WorkflowEvent = {
    type: "unsettled-material-input",
    proposal,
    settled,
    resultRef,
    modifiers: outcome.modifiers,
    candidates,
  };
  return waitingOn(routed, questions, [], after);
}

// The events the answer to the candidate question adds: the route it chose, with its plan, the
// route's default modifiers and the flow it binds.
export function routeChoiceEvents(
  snapshot: WorkflowSnapshot,
  questionPurpose: string | undefined,
  optionIds: readonly string[],
): WorkflowEvent[] {
  if (questionPurpose !== "route") return [];
  const chosen = snapshot.routeCandidates?.find((each) => optionIds.includes(each.route));
  if (!chosen) return [];
  const decided: WorkflowEvent = {
    type: "route-decided",
    route: chosen.route,
    rule: chosen.rule,
    plan: chosen.plan,
    modifiers: chosen.modifiers,
  };
  return [decided, ...(chosen.flowId ? [{ type: "binding-recorded", flowId: chosen.flowId }] : [])];
}

function blockedRouting(run: WorkflowRun, result: WorkflowResult): WorkflowDecision {
  const blocked = { ...run, state: "blocked", sequence: run.sequence + 1 };
  const event = {
    type: "missing-capability",
    resultRef: `results/${result.resultId}.json`,
    stageInstanceId: result.stageInstanceId,
    outcome: result.outcome,
  };
  return { verdict: { ok: true, run: blocked }, events: [event] };
}

// The route routing gives: the destination a re-route fixed, which the decision rules do not
// choose again, or the route the decision rules give the extraction.
function outcomeOf(
  snapshot: WorkflowSnapshot,
  proposal: WorkflowProposal,
  facts: WorkflowFacts,
): RoutingOutcome | undefined {
  const pending = snapshot.pendingReroute;
  const defaults = defaultsIn(facts.plans);
  if (!pending) return routingOutcome(proposal.extraction, defaults);
  if (!isWorkflowRoute(pending.route)) return undefined;
  const taken = { route: pending.route, rule: pending.rule ?? null, clause: 0 };
  return reroutedOutcome(proposal.extraction, taken, defaults);
}

// `accept` of the routing work order's result: a blocked result blocks the run; otherwise the
// decision rules choose the route from the extraction, and the proposal is checked against it.
export function acceptRouting(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run } = snapshot;
  if (result.outcome === "blocked") return blockedRouting(run, result);
  const proposal = result.proposal;
  if (result.outcome !== "accepted" || !proposal || routingShapeIsBroken(proposal)) {
    return routingNotReady(run);
  }
  const outcome = outcomeOf(snapshot, proposal, facts);
  if (!outcome) return routingNotReady(run);
  const routes = outcome.taken
    ? [outcome.taken.route]
    : outcome.candidates.map((each) => each.route);
  const refusals = proposalRefusals(proposal, facts, routes);
  if (refusals.length > 0) return proposalRefused(run, refusals);
  const inputs = (proposal.unresolvedQuestions ?? []).map(parseQuestionInput);
  const parsed = inputs.flatMap((question) => question ?? []);
  if (parsed.length !== inputs.length) {
    return refusedWith(run, [{ reason: "schema", subject: "unresolvedQuestions" }]);
  }
  const settled = { routingResultId: result.resultId, answers: snapshot.settled?.answers ?? [] };
  const routed = {
    snapshot,
    run,
    proposal,
    facts,
    settled,
    resultRef: `results/${result.resultId}.json`,
    inputs: parsed,
  };
  const { taken } = outcome;
  return taken ? fixedRoute(routed, outcome, taken) : candidateRouting(routed, outcome);
}
