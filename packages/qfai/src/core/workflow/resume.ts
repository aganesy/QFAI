import { REPLAN_BUDGET, refusedFailClosed, refusedInput } from "./common.js";
import { escapedPaths } from "./finish.js";
import { issueNext } from "./issue.js";
import type {
  FailClosedCause,
  WorkflowAcceptedStage,
  WorkflowDecision,
  WorkflowEvent,
  WorkflowFacts,
  WorkflowHalt,
  WorkflowReceiptClass,
  WorkflowSnapshot,
  WorkflowStartAdjustment,
  WorkflowWorkOrder,
} from "./types.js";

// Each watched file whose digest differs from the one fixed at `start`, an added or removed
// file included.
function driftedPolicyPaths(snapshot: WorkflowSnapshot, facts: WorkflowFacts): string[] {
  const fixed = snapshot.executionContext;
  const now = facts.policyNow;
  if (!fixed || !now) return [];
  const kinds = ["policyDigests", "planDigests"] as const;
  return kinds.flatMap((kind) => {
    const [before, after] = [fixed[kind], now[kind]];
    const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return paths.filter((watched) => before[watched] !== after[watched]).sort();
  });
}

function identityChanged(snapshot: WorkflowSnapshot, facts: WorkflowFacts): boolean {
  const [fixed, now] = [snapshot.identity, facts.identity];
  return !!fixed && !!now && (fixed.worktree !== now.worktree || fixed.branch !== now.branch);
}

type FoundCause = { cause: FailClosedCause; subjects: string[] };

// A cause observed for this operation: one an observer reported, drifted policy, or a changed
// branch or worktree.
function observedCause(snapshot: WorkflowSnapshot, facts: WorkflowFacts): FoundCause | undefined {
  if (facts.cause) return { cause: facts.cause, subjects: facts.causeSubjects ?? [] };
  const drifted = driftedPolicyPaths(snapshot, facts);
  if (drifted.length > 0) return { cause: "policy-drift", subjects: drifted };
  return identityChanged(snapshot, facts)
    ? { cause: "invariant-violation", subjects: [] }
    : undefined;
}

// The fail-closed cause found for this operation: an observed one, or a cumulative change that
// escaped the run change boundary.
export function foundCause(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
): FoundCause | undefined {
  const observed = observedCause(snapshot, facts);
  if (observed) return observed;
  const escaped = escapedPaths(snapshot, facts.observedChangedPaths ?? [], facts);
  return escaped.length > 0 ? { cause: "invariant-violation", subjects: escaped } : undefined;
}

// Each accepted stage's receipt as the facts class it. A receipt after one that is not valid is
// invalidated with it, so it is at best `stale`.
function classedReceipts(snapshot: WorkflowSnapshot, facts: WorkflowFacts) {
  let invalidated = false;
  return (snapshot.acceptedStages ?? []).flatMap((stage): WorkflowReceiptClass[] => {
    if (!stage.receiptRef) return [];
    const own = facts.receiptValidity?.[stage.receiptRef] ?? "unknown";
    const validity = invalidated && own === "valid" ? "stale" : own;
    invalidated ||= own !== "valid";
    return [{ ref: stage.receiptRef, validity }];
  });
}

function checkpointOf(
  accepted: readonly WorkflowAcceptedStage[],
  receipts: readonly WorkflowReceiptClass[],
): number {
  return accepted.findIndex((stage) =>
    receipts.some(({ ref, validity }) => ref === stage.receiptRef && validity !== "valid"),
  );
}

// A receipt that is not valid, including one whose dependency cannot be read, reopens its
// stage: the run restarts at the first accepted stage whose receipt does not hold. The journal's
// integrity is checked when the run is read, before any decision.
function resumeFromCheckpoint(
  snapshot: WorkflowSnapshot,
  facts: WorkflowFacts,
): WorkflowDecision | undefined {
  const receipts = classedReceipts(snapshot, facts);
  const accepted = snapshot.acceptedStages ?? [];
  const checkpoint = checkpointOf(accepted, receipts);
  if (checkpoint < 0) return undefined;
  const events: WorkflowEvent[] = [
    { type: "observed-session-interruption" },
    { type: "reconciled-resume" },
  ];
  const { outstandingWorkOrder: _abandoned, ...rest } = snapshot;
  const run = { ...snapshot.run, state: "ready", sequence: snapshot.run.sequence + events.length };
  const acceptedStages = accepted.slice(0, checkpoint);
  const issued = issueNext({ ...rest, run, acceptedStages }, facts);
  if (!issued.verdict.ok) return issued;
  return {
    verdict: { ...issued.verdict, classedReceipts: receipts },
    events: [...events, ...issued.events],
  };
}

// A crash can leave a run in `created` before its request was captured.
function resumeCreated(run: WorkflowSnapshot["run"]): WorkflowDecision {
  return {
    verdict: { ok: true, run: { ...run, state: "routing", sequence: run.sequence + 1 } },
    events: [{ type: "capture-request" }],
  };
}

// The path a blocker names a finding by, from its `<findingCode>@<path>` subject.
function findingPathOf(subject: string): string {
  return subject.slice(subject.indexOf("@") + 1);
}

// A scope-dependency blocker repaired outside the run admits only an in-force change request
// row that names a path the blocker's findings name: that row's change to `decisions.md`, and
// those named paths, each at its current digest. Undefined when any escaped path is not admitted.
function repairAdjustments(
  snapshot: WorkflowSnapshot,
  escaped: readonly string[],
  facts: WorkflowFacts,
): WorkflowStartAdjustment[] | undefined {
  const halt = snapshot.halt;
  const named = halt?.blocker === "scope-dependency" ? halt.subjects.map(findingPathOf) : [];
  const decisions = `${facts.specsDir ?? ".qfai/spec"}/decisions.md`;
  const admitted = (facts.changeRequests ?? [])
    .filter((row) => row.inForce)
    .map(({ rowId, paths }) => ({ rowId, paths: paths.filter((each) => named.includes(each)) }))
    .filter(({ paths }) => paths.length > 0)
    .flatMap(({ rowId, paths }) =>
      [decisions, ...paths].map((admittedPath) => ({ admittedPath, rowId })),
    );
  const adjustments: WorkflowStartAdjustment[] = [];
  for (const escapedPath of escaped) {
    const entry = admitted.find(({ admittedPath }) => admittedPath === escapedPath);
    const digest = facts.fileDigests?.[escapedPath];
    if (!entry || digest === undefined) return undefined;
    adjustments.push({ path: escapedPath, digest, changeRequest: entry.rowId });
  }
  return adjustments;
}

function resumeReady(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const receipts = classedReceipts(snapshot, facts);
  const accepted = snapshot.acceptedStages ?? [];
  const checkpoint = checkpointOf(accepted, receipts);
  const acceptedStages = checkpoint < 0 ? accepted : accepted.slice(0, checkpoint);
  const issued = issueNext({ ...snapshot, acceptedStages }, facts);
  if (!issued.verdict.ok || receipts.length === 0) return issued;
  return { ...issued, verdict: { ...issued.verdict, classedReceipts: receipts } };
}

// The core cannot observe a blocker a stage reported, so resume reissues that stage's work
// order as a new attempt, and the new result decides whether the block still holds.
// A change outside the run change boundary that no in-force repair admits keeps it blocked.
// A run blocked on its spent replan budget stays blocked while the routing receipt still does not
// hold: nothing has changed, so nothing is written.
function replanBudgetStillSpent(snapshot: WorkflowSnapshot, facts: WorkflowFacts): boolean {
  const { halt, routingReceiptRef: ref } = snapshot;
  return (
    halt?.blocker === "budget-exhausted" &&
    halt.subjects.includes("replan") &&
    (snapshot.replans ?? 0) >= REPLAN_BUDGET &&
    ref !== undefined &&
    facts.receiptValidity?.[ref] !== "valid"
  );
}

function resumeBlocked(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run } = snapshot;
  if (replanBudgetStillSpent(snapshot, facts)) {
    return {
      verdict: {
        ok: true,
        run,
        workOrder: null,
        ...(snapshot.halt ? { halt: snapshot.halt } : {}),
      },
      events: [],
    };
  }
  const observed = observedCause(snapshot, facts);
  if (observed) return refusedFailClosed(run, observed.cause);
  const escaped = escapedPaths(snapshot, facts.observedChangedPaths ?? [], facts);
  const adjustments = repairAdjustments(snapshot, escaped, facts);
  if (!adjustments) return refusedFailClosed(run, "invariant-violation");
  const { outstandingWorkOrder: _blocked, halt: _cleared, ...rest } = snapshot;
  const startAdjustments = [...(snapshot.startAdjustments ?? []), ...adjustments];
  const ready = { ...run, state: "ready", sequence: run.sequence + 1 };
  const issued = issueNext({ ...rest, run: ready, startAdjustments }, facts);
  if (!issued.verdict.ok) return issued;
  const cleared: WorkflowEvent = {
    type: "blocker-cleared-and-revalidated",
    ...(adjustments.length > 0 ? { adjustments } : {}),
  };
  return { ...issued, events: [cleared, ...issued.events] };
}

// A long implement stage resumes at the first example of its flow that no test annotates yet.
function withCheckpoint(workOrder: WorkflowWorkOrder, facts: WorkflowFacts): WorkflowWorkOrder {
  const flowId = workOrder.target?.kind === "flow" ? workOrder.target.flowId : undefined;
  const obligations = facts.obligations;
  if (workOrder.stageKind !== "implement" || !flowId || obligations?.flowId !== flowId) {
    return workOrder;
  }
  const checkpointRef = obligations.exampleIds.find((id) => !obligations.annotated.includes(id));
  return checkpointRef ? { ...workOrder, checkpointRef } : workOrder;
}

function resumeRunning(
  snapshot: WorkflowSnapshot,
  workOrder: WorkflowWorkOrder,
  facts: WorkflowFacts,
): WorkflowDecision {
  const found = foundCause(snapshot, facts);
  if (found) {
    const halt: WorkflowHalt = { cause: found.cause, owner: "operator", subjects: found.subjects };
    const events: WorkflowEvent[] = [
      { type: "observed-session-interruption" },
      { type: "reconciled-with-blocker", cause: found.cause, halt },
    ];
    const run = { ...snapshot.run, state: "blocked", sequence: snapshot.run.sequence + 2 };
    return { verdict: { ok: true, run, halt }, events };
  }
  const checkpoint = resumeFromCheckpoint(snapshot, facts);
  if (checkpoint) return checkpoint;
  const events: WorkflowEvent[] = [
    { type: "observed-session-interruption" },
    { type: "reconciled-resume" },
    { type: "dispatch-work-order" },
  ];
  const run = { ...snapshot.run, sequence: snapshot.run.sequence + events.length };
  const receipts = classedReceipts(snapshot, facts);
  const classed = receipts.length > 0 ? { classedReceipts: receipts } : {};
  return {
    verdict: { ok: true, run, workOrder: withCheckpoint(workOrder, facts), ...classed },
    events,
  };
}

// `resume`: revalidate the stored run against the tree now, and return the work order `next`
// would return from the smallest valid checkpoint.
export function decideResume(snapshot: WorkflowSnapshot, facts: WorkflowFacts): WorkflowDecision {
  const { run, outstandingWorkOrder } = snapshot;
  if (run.state === "created") return resumeCreated(run);
  if (run.state === "ready") return resumeReady(snapshot, facts);
  if (run.state === "blocked") return resumeBlocked(snapshot, facts);
  if (run.state === "running" && outstandingWorkOrder) {
    return resumeRunning(snapshot, outstandingWorkOrder, facts);
  }
  return refusedInput(run, "The run cannot resume from here. Read the run's status.");
}
