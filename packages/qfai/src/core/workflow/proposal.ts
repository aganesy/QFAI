import path from "node:path";

import { DEFAULT_SPECS_DIR, refusedWith, UNTARGETED_KINDS } from "./common.js";
import { createQuestion } from "./issue.js";
import { parseQuestionInput } from "./parse.js";
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
  WorkflowRun,
  WorkflowSnapshot,
} from "./types.js";

const REQUEST_KINDS = [
  "change",
  "read_only",
  "plan_only",
  "verify_only",
  "resume",
  "cancel",
  "explicit_stage",
];

const PROTECTED_PREFIXES = [
  ".git/",
  ".qfai/run/",
  ".qfai/evidence/workflow/",
  ".qfai/evidence/decision/",
];

function literalPrefix(area: string): string {
  const glob = area.search(/[*?[{]/);
  return glob < 0 ? area : area.slice(0, glob);
}

// SIMPLIFIED: two write areas overlap when one's literal prefix contains the other's.
// Lift when: a glob pair that shares no path is refused and the refusal is observed.
function areasOverlap(left: string, right: string): boolean {
  const leftPrefix = literalPrefix(left);
  const rightPrefix = literalPrefix(right);
  const leftIsGlob = leftPrefix !== left;
  const rightIsGlob = rightPrefix !== right;
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`) ||
    (leftIsGlob && right.startsWith(leftPrefix)) ||
    (rightIsGlob && left.startsWith(rightPrefix))
  );
}

// A write area inside a protected directory, naming one of the two tables, or overlapping a
// target the proposal protects.
function touchesProtectedSurface(area: string, protectedTargets: readonly string[], specs: string) {
  const prefix = literalPrefix(area);
  const tables = [`${specs}/decisions.md`, `${specs}/open-questions.md`];
  return (
    PROTECTED_PREFIXES.some(
      (surface) =>
        prefix.startsWith(surface) ||
        `${area}/` === surface ||
        (prefix !== area && surface.startsWith(prefix)),
    ) ||
    tables.some((table) => areasOverlap(area, table)) ||
    protectedTargets.some((target) => areasOverlap(area, target))
  );
}

function escapesRoot(area: string): boolean {
  const normalized = path.posix.normalize(area.replaceAll("\\", "/"));
  return (
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(area) ||
    normalized === ".." ||
    normalized.startsWith("../")
  );
}

// SIMPLIFIED: any open question counts as asking every material risk signal.
// Lift when: a question input names the risk signal it asks about.
function unaskedRiskSignals(proposal: WorkflowProposal): string[] {
  if ((proposal.unresolvedQuestions ?? []).length > 0) return [];
  return (proposal.riskSignals ?? []).filter((signal) => signal !== "authorization-restored");
}

function builtInPlanOf(proposal: WorkflowProposal, facts: WorkflowFacts) {
  return proposal.candidateRoute ? facts.plans?.[proposal.candidateRoute] : undefined;
}

function stageSetGaps(proposal: WorkflowProposal, facts: WorkflowFacts): string[] {
  const required = proposal.requiredStages;
  const plan = builtInPlanOf(proposal, facts);
  const planKinds = (plan?.stages ?? []).map((stage) => stage.stageKind);
  const omittedAlways = (plan?.stages ?? [])
    .filter((stage) => stage.when === "always" && !required.includes(stage.stageKind))
    .map((stage) => stage.stageKind);
  const changeRoute = proposal.candidateRoute !== null && proposal.candidateRoute !== "discovery";
  const omittedVerify = changeRoute && !required.includes("verify") ? ["verify"] : [];
  const unknown = plan ? required.filter((kind) => !planKinds.includes(kind)) : [];
  return [...new Set([...omittedAlways, ...omittedVerify, ...unknown])];
}

// Whether the proposal's plan has a stage that takes the bound flow as its target.
function takesFlowTarget(proposal: WorkflowProposal, facts: WorkflowFacts): boolean {
  const plan = builtInPlanOf(proposal, facts);
  return (plan?.stages ?? []).some((stage) => !UNTARGETED_KINDS.includes(stage.stageKind));
}

// The one flow a proposal with no new story binds, or the subject a `flow-binding` refusal
// names.
export function flowToBind(
  proposal: WorkflowProposal,
  facts: WorkflowFacts,
): { flowId?: string; refused?: string } {
  if (proposal.newStories.length > 0 || !takesFlowTarget(proposal, facts)) return {};
  const named = proposal.affectedFlowIds ?? [];
  const [flowId] = named;
  if (named.length !== 1 || flowId === undefined || !(facts.flows ?? []).includes(flowId)) {
    return { refused: named.length > 0 ? named.join(",") : "affectedFlowIds" };
  }
  return { flowId };
}

function refusalsOf(reason: ProposalRefusalReason, subjects: readonly string[]): ProposalRefusal[] {
  return subjects.map((subject) => ({ reason, subject }));
}

function referenceRefusals(proposal: WorkflowProposal, facts: WorkflowFacts): ProposalRefusal[] {
  const references = [...proposal.expectedBehaviorRefs, ...proposal.observedRefs];
  const pathReferences = references
    .filter((reference) => reference.kind === "path" || reference.kind === "evidence")
    .map((reference) => reference.ref);
  const unknownPaths = [...new Set(pathReferences)].filter(
    (ref) => facts.pathExistence?.[ref] !== true,
  );
  // SIMPLIFIED: a contract reference resolves against no index, so it is always unknown.
  // Lift when: a route proposal needs to cite a contract as the normative source of a change.
  const unknownIds = references
    .filter(
      (reference) =>
        (reference.kind === "flow-id" && !(facts.flows ?? []).includes(reference.ref)) ||
        reference.kind === "contract-id",
    )
    .map((reference) => reference.ref);
  return [...refusalsOf("unknown-path", unknownPaths), ...refusalsOf("unknown-id", unknownIds)];
}

function proposalRefusals(proposal: WorkflowProposal, facts: WorkflowFacts): ProposalRefusal[] {
  const specs = facts.specsDir ?? DEFAULT_SPECS_DIR;
  const scope = proposal.proposedWriteScope ?? [];
  const protectedAreas = scope.filter((area) =>
    touchesProtectedSurface(area, proposal.protectedTargets ?? [], specs),
  );
  const binding = flowToBind(proposal, facts).refused;
  return [
    ...referenceRefusals(proposal, facts),
    ...refusalsOf("protected-surface", protectedAreas),
    ...refusalsOf("scope-escape", proposal.requestKind === "change" ? [] : [proposal.requestKind]),
    ...refusalsOf("scope-escape", scope.filter(escapesRoot)),
    ...refusalsOf("unresolved-approval", unaskedRiskSignals(proposal)),
    ...refusalsOf("stage-set", stageSetGaps(proposal, facts)),
    ...refusalsOf("flow-binding", binding === undefined ? [] : [binding]),
  ];
}

function checkedPlan(proposal: WorkflowProposal, facts: WorkflowFacts): WorkflowPlan | undefined {
  const builtIn = builtInPlanOf(proposal, facts);
  if (!builtIn || !proposal.goal || !Array.isArray(proposal.proposedWriteScope)) return undefined;
  return {
    route: builtIn.route,
    goal: proposal.goal,
    stages: builtIn.stages,
    writeScope: proposal.proposedWriteScope,
    expectedBehaviorRefs: proposal.expectedBehaviorRefs,
    observedRefs: proposal.observedRefs,
    ...(proposal.riskSignals?.length ? { riskSignals: proposal.riskSignals } : {}),
  };
}

// Whether a routing result carries what routing needs to be checked at all.
function routingShapeIsBroken(proposal: WorkflowProposal | undefined): boolean {
  if (!proposal || !REQUEST_KINDS.includes(proposal.requestKind)) return true;
  const stories = proposal.newStories;
  return (
    (proposal.requestKind === "change" && !proposal.candidateRoute) ||
    !Array.isArray(proposal.expectedBehaviorRefs) ||
    !Array.isArray(proposal.observedRefs) ||
    !Array.isArray(proposal.requiredStages) ||
    !Array.isArray(stories) ||
    (proposal.candidateRoute === "feature" && stories.length === 0) ||
    stories.some(
      (story) =>
        !story.goal ||
        !Array.isArray(story.covers) ||
        !Array.isArray(story.excludes) ||
        !Array.isArray(story.evidence) ||
        story.evidence.length === 0 ||
        (story.flowId !== null && typeof story.flowId !== "string"),
    )
  );
}

function routingNotReady(run: WorkflowRun): WorkflowDecision {
  const message = "The routing result is not ready. Check it and submit again.";
  return { verdict: { ok: false, run, error: { code: "invalid-input", message } }, events: [] };
}

function proposalRefused(run: WorkflowRun, reasons: ProposalRefusal[]): WorkflowDecision {
  const message = "The route proposal failed a check. Revise it and submit it again.";
  return {
    verdict: { ok: false, run, error: { code: "proposal-refused", message, reasons } },
    events: [],
  };
}

// One `create` question per new-story slot, then each unresolved question in its order.
function routingQuestions(
  run: WorkflowRun,
  proposal: WorkflowProposal,
  inputs: NonNullable<ReturnType<typeof parseQuestionInput>>[],
): WorkflowQuestion[] {
  const questions: WorkflowQuestion[] = proposal.newStories.map((story, index) =>
    createQuestion(`question-${run.sequence + 1}-${index + 1}`, {
      goal: story.goal,
      covers: story.covers,
      excludes: story.excludes,
      flowId: story.flowId,
      slotId: `slot-${run.sequence + 1}-${index + 1}`,
    }),
  );
  for (const input of inputs) {
    questions.push({
      ...input,
      questionId: `question-${run.sequence + 1}-${questions.length + 1}`,
    });
  }
  return questions;
}

// The checked routing result: the plan accepted, or the questions it opens first. A proposal
// with no new story binds its one flow in the same step.
function routedDecision(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  proposal: WorkflowProposal,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run } = snapshot;
  const plan = checkedPlan(proposal, facts);
  const settled = { routingResultId: result.resultId, answers: snapshot.settled?.answers ?? [] };
  const inputs = (proposal.unresolvedQuestions ?? []).map(parseQuestionInput);
  const parsed = inputs.flatMap((question) => question ?? []);
  if (parsed.length !== inputs.length) {
    return refusedWith(run, [{ reason: "schema", subject: "unresolvedQuestions" }]);
  }
  const flowId = flowToBind(proposal, facts).flowId;
  const binding: WorkflowEvent[] = flowId ? [{ type: "binding-recorded", flowId }] : [];
  if (proposal.newStories.length === 0 && parsed.length === 0) {
    if (!plan) return routingNotReady(run);
    const events = [...binding, { type: "plan-accepted", plan, settled }];
    const ready = { ...run, state: "ready", sequence: run.sequence + events.length };
    return { verdict: { ok: true, run: ready, plan }, events };
  }
  const questions = routingQuestions(run, proposal, parsed);
  const events: WorkflowEvent[] = [
    ...questions.map((question) => ({ type: "question-opened", question })),
    ...binding,
    { type: "unsettled-material-input", proposal, settled },
  ];
  const waiting = { ...run, state: "awaiting_input", sequence: run.sequence + events.length };
  return { verdict: { ok: true, run: waiting, questions, ...(plan ? { plan } : {}) }, events };
}

// `accept` of the routing work order's result: a blocked result blocks the run, and a checked
// proposal becomes the run's plan.
export function acceptRouting(
  snapshot: WorkflowSnapshot,
  result: WorkflowResult,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run } = snapshot;
  if (result.outcome === "blocked") {
    const blocked = { ...run, state: "blocked", sequence: run.sequence + 1 };
    const event = {
      type: "missing-capability",
      resultRef: `results/${result.resultId}.json`,
      stageInstanceId: result.stageInstanceId,
      outcome: result.outcome,
    };
    return { verdict: { ok: true, run: blocked }, events: [event] };
  }
  const proposal = result.proposal;
  if (result.outcome !== "accepted" || routingShapeIsBroken(proposal) || !proposal) {
    return routingNotReady(run);
  }
  const refusals = proposalRefusals(proposal, facts);
  if (refusals.length > 0) return proposalRefused(run, refusals);
  return routedDecision(snapshot, result, proposal, facts);
}
