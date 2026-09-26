import { decideAnswer, decideStop, replayedAnswer } from "./answer.js";
import { notReady, refusedFailClosed, scopeOf, TERMINAL_STATES } from "./common.js";
import { decideFinish } from "./finish.js";
import { issueNext } from "./issue.js";
import { acceptRouting } from "./proposal.js";
import { acceptPreamble, acceptSeamOnly, acceptStageResult, blockOnResult } from "./result.js";
import { decideResume, foundCause } from "./resume.js";
import { decideStart } from "./start.js";
import type {
  WorkflowDecision,
  WorkflowFacts,
  WorkflowInput,
  WorkflowSnapshot,
  WorkflowWorkOrder,
} from "./types.js";

export type * from "./types.js";
export { areaCovers, scopeDigestOf } from "./common.js";

// A work order as `next` returns it and the run's work-orders directory holds it: every field
// the contract names, the run it belongs to and the sequence its result must carry.
// SIMPLIFIED: requires no gate of its own, and carries no protected targets or non-goals; the
// gates are judged at `finish`.
// Lift when: a stage kind is defined to require a gate, or the checked plan keeps the
// proposal's protected targets and a source of non-goals.
export function workOrderDocument(
  runId: string,
  expectedSequence: number,
  workOrder: WorkflowWorkOrder,
) {
  const scope = workOrder.scope ?? scopeOf([], []);
  return {
    runId,
    ...workOrder,
    scope: {
      digest: scope.digest ?? "",
      writeAreas: scope.writeAreas,
      protectedTargets: [],
      allowedEffects: scope.allowedEffects ?? [],
      nonGoals: [],
    },
    recordAreas: workOrder.recordAreas ?? [],
    inputs: workOrder.inputs ?? [],
    requiredGates: [],
    requiredReviewerRoles: workOrder.requiredReviewerRoles ?? [],
    actorHistory: workOrder.actorHistory ?? [],
    authorizationRefs: workOrder.authorizationRefs ?? [],
    priorStageReceiptRefs: workOrder.priorStageReceiptRefs ?? [],
    expectedSequence,
  };
}

// A replay returns the verdict it was given, whatever state the run is in now.
function replayOf(snapshot: WorkflowSnapshot, input: WorkflowInput): WorkflowDecision | undefined {
  const result = input.result;
  const recorded = result ? snapshot.recordedResults?.[result.resultId] : undefined;
  if (input.operation === "accept") {
    const same = recorded !== undefined && recorded.payloadDigest === input.payloadDigest;
    return same ? { verdict: recorded.verdict, events: [] } : undefined;
  }
  if (input.operation !== "decision") return undefined;
  if (input.stop === true) {
    return snapshot.stopVerdict ? { verdict: snapshot.stopVerdict, events: [] } : undefined;
  }
  return replayedAnswer(snapshot, input);
}

// The routing work order. Its kind, skill and operation are built in, and no plan names it; it
// changes no state, and `next` returns it again until its result is accepted.
function issueRouting(snapshot: WorkflowSnapshot): WorkflowDecision {
  const { run, outstandingWorkOrder } = snapshot;
  if (outstandingWorkOrder?.stageKind === "route") {
    return { verdict: { ok: true, run, workOrder: outstandingWorkOrder }, events: [] };
  }
  const attempt = (snapshot.attempts?.route ?? 0) + 1;
  const workOrder: WorkflowWorkOrder = {
    workOrderId: `work-order-route-${attempt}`,
    stageInstanceId: "route",
    attempt,
    stageKind: "route",
    executor: { skill: "qfai-run" },
    operation: "route",
  };
  return {
    verdict: { ok: true, run: { ...run, sequence: run.sequence + 1 }, workOrder },
    events: [{ type: "work-order-issued", workOrder }],
  };
}

// A work order is refreshed to name each input by the digest the file has now, never a stale
// one.
function refreshedInputs(workOrder: WorkflowWorkOrder, facts: WorkflowFacts): WorkflowWorkOrder {
  if (!workOrder.inputs) return workOrder;
  const inputs = workOrder.inputs.map((input) => ({
    path: input.path,
    digest: facts.fileDigests?.[input.path] ?? input.digest,
  }));
  return { ...workOrder, inputs };
}

function decideNext(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run, outstandingWorkOrder: workOrder } = snapshot;
  if (run.state === "routing") return issueRouting(snapshot);
  if (run.state === "ready") return issueNext(snapshot, facts);
  if (run.state === "running" && workOrder) {
    return { verdict: { ok: true, run, workOrder: refreshedInputs(workOrder, facts) }, events: [] };
  }
  if (run.state !== "awaiting_input" && run.state !== "blocked") return notReady(run, "work order");
  // An unanswered question is never answered by asking for work: nothing is issued or recorded.
  const questions = snapshot.openQuestions ?? [];
  const halt = snapshot.halt ? { halt: snapshot.halt } : {};
  return { verdict: { ok: true, run, workOrder: null, questions, ...halt }, events: [] };
}

function decideAccept(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  const { run, outstandingWorkOrder: workOrder } = snapshot;
  const result = input.result;
  if (!result) return notReady(run, "stage result");
  const refused = acceptPreamble(snapshot, result);
  if (refused) return refused;
  // A cause found on a run in `running` or `routing` blocks it over that state's edge.
  const found = foundCause(snapshot, facts);
  if (found && run.state === "running") {
    return blockOnResult(run, result, undefined, { ...found, owner: "operator" });
  }
  if (found && run.state === "routing") {
    return blockOnResult(run, result, "missing-capability", { ...found, owner: "operator" });
  }
  if (run.state === "routing" && workOrder?.stageKind === "route") {
    return acceptRouting(snapshot, result, facts);
  }
  if (run.state !== "running" || !workOrder) return notReady(run, "stage result");
  if (workOrder.operation === "seam-only") return acceptSeamOnly(snapshot, workOrder, result);
  return acceptStageResult(snapshot, result, facts);
}

// Before `start` there is no run, so `start` alone takes no snapshot.
export function decide(
  snapshot: null,
  input: WorkflowInput & { operation: "start" },
  facts: WorkflowFacts,
): WorkflowDecision;
export function decide(
  snapshot: WorkflowSnapshot,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision;
export function decide(
  snapshot: WorkflowSnapshot | null,
  input: WorkflowInput,
  facts: WorkflowFacts,
): WorkflowDecision {
  if (!snapshot) return decideStart(input, facts);
  const replayed = replayOf(snapshot, input);
  if (replayed) return replayed;
  const run = snapshot.run;
  if (TERMINAL_STATES.includes(run.state)) {
    const message = "The run has ended. Start a new run to continue.";
    return { verdict: { ok: false, run, error: { code: "run-terminal", message } }, events: [] };
  }
  if (input.operation === "decision" && input.stop === true) return decideStop(run, input);
  if (input.operation === "resume" && snapshot.identity && facts.identity) {
    if (snapshot.identity.worktree !== facts.identity.worktree) return identityMismatch(run);
  }
  // A cause found where the state machine has no edge to `blocked` refuses the operation;
  // at `finish` it is an unmet condition instead.
  const found = input.operation === "finish" ? undefined : foundCause(snapshot, facts);
  if (found && (run.state === "ready" || run.state === "awaiting_input")) {
    return refusedFailClosed(run, found.cause);
  }
  switch (input.operation) {
    case "finish":
      return decideFinish(snapshot, facts);
    case "resume":
      return decideResume(snapshot, facts);
    case "decision":
      return decideAnswer(snapshot, input, facts);
    case "next":
      return decideNext(snapshot, facts);
    case "accept":
      return decideAccept(snapshot, input, facts);
    default:
      return notReady(run, "operation");
  }
}

function identityMismatch(run: WorkflowSnapshot["run"]): WorkflowDecision {
  const message =
    "This run belongs to another worktree. Resume it from the worktree that started it.";
  return { verdict: { ok: false, run, error: { code: "identity-mismatch", message } }, events: [] };
}
