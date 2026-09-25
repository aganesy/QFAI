// QFAI:SPEC-0018:TC-0018-0082

import { expect, it } from "vitest";

import {
  decide,
  type WorkflowInput as Input,
  type WorkflowSnapshot as Snapshot,
} from "../../../src/core/workflow/decide.js";
import {
  foldRecord,
  recordsOf,
  type JournalRecord,
} from "../../../src/core/workflow/persistence.js";

function stagesOf(rows: string[][]) {
  return rows.map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: when ?? "always",
  }));
}

const plan = {
  route: "bounded-change",
  stages: stagesOf([
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ]),
};
const specBinding = { specId: "spec-0007" };
const acceptedStages = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
];
const specFinding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/spec-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningSpec: "spec-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};
const testFinding = {
  ...specFinding,
  findingCode: "QFAI-ATDD-001",
  path: "tests/e2e/checkout.spec.ts",
  cause: "An acceptance test asserts a response the contract does not define",
  resolvingOwner: "qfai-atdd",
};
const verifyOrder = {
  workOrderId: "work-order-bounded-verify-1",
  stageInstanceId: "bounded-verify",
  attempt: 1,
  stageKind: "verify",
  target: { kind: "spec" as const, specId: "spec-0007" },
  executor: { skill: "qfai-verify" },
  operation: "verify-full",
};

// A run whose verify work order is outstanding.
function verifying(extra: Partial<Snapshot> = {}): Snapshot {
  return {
    run: { id: "run-repair", state: "running", sequence: 12 },
    plan,
    specBinding,
    acceptedStages,
    attempts: { "bounded-sdd-delta": 1, "bounded-implement": 1, "bounded-verify": 1 },
    outstandingWorkOrder: verifyOrder,
    ...extra,
  };
}

// One operation decided, and its events folded into the snapshot as the journal records them.
function step(snapshot: Snapshot, input: Input) {
  const decision = decide(snapshot, input, {});
  const records = recordsOf(decision, { operation: input.operation, before: snapshot.run });
  const folded = records
    .map((record): JournalRecord => ({ ...record, prevHash: null }))
    .reduce(foldRecord, snapshot);
  return { decision, snapshot: folded };
}

// The result a stage returns for the work order outstanding on the snapshot.
function resultFor(snapshot: Snapshot, outcome: string, debts?: (typeof specFinding)[]): Input {
  const order = snapshot.outstandingWorkOrder;
  if (!order) throw new Error("a work order is outstanding");
  return {
    operation: "accept",
    result: {
      resultId: `result-${order.stageInstanceId}-${order.attempt}`,
      workOrderId: order.workOrderId,
      stageInstanceId: order.stageInstanceId,
      attempt: order.attempt,
      expectedSequence: snapshot.run.sequence,
      outcome,
      ...(debts ? { debts } : {}),
    },
  };
}

it("TC-0018-0082 (TDD-0101): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd", () => {
  const accepted = step(verifying(), resultFor(verifying(), "needs_repair", [specFinding]));
  const next = step(accepted.snapshot, { operation: "next" });

  expect({
    state: accepted.decision.verdict.run?.state,
    executor: next.decision.verdict.workOrder?.executor?.skill,
    stageKind: next.decision.verdict.workOrder?.stageKind,
  }).toEqual({ state: "ready", executor: "qfai-sdd", stageKind: "sdd_delta" });
});

it("A repair whose owner no plan stage serves returns the run to routing, and the stage that found it runs again after the repair", () => {
  const repair = step(verifying(), resultFor(verifying(), "needs_repair", [testFinding]));
  const routing = step(repair.snapshot, { operation: "next" });
  const replanned = {
    ...plan,
    stages: stagesOf([
      ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
      ["bounded-implement", "implement", "qfai-implement", "implement"],
      [
        "bounded-acceptance",
        "acceptance",
        "qfai-atdd",
        "acceptance-tests",
        "acceptance_obligations_unmet",
      ],
      ["bounded-verify", "verify", "qfai-verify", "verify-full"],
    ]),
  };
  const planned = foldRecord(routing.snapshot, {
    sequence: routing.snapshot.run.sequence + 1,
    prevHash: null,
    event: "plan-accepted",
    operation: "accept",
    recordedAt: new Date(0).toISOString(),
    from: "routing",
    to: "ready",
    plan: { ...replanned, goal: "", writeScope: [], expectedBehaviorRefs: [], observedRefs: [] },
  });
  const repairing = step(planned, { operation: "next" });
  const repaired = step(repairing.snapshot, resultFor(repairing.snapshot, "accepted"));
  const rerun = step(repaired.snapshot, { operation: "next" });

  expect({
    afterFinding: repair.decision.verdict.run?.state,
    revision: repair.decision.events.map((event) => event.type),
    repairRequest: repair.snapshot.repairRequest,
    acceptedBeforeRepair: repair.snapshot.acceptedStages?.length,
    routingOrder: routing.decision.verdict.workOrder?.stageKind,
    repairExecutor: repairing.decision.verdict.workOrder?.executor?.skill,
    afterRepair: repaired.decision.verdict.run?.state,
    repairClosed: repaired.snapshot.repairRequest,
    rerunStage: rerun.decision.verdict.workOrder?.stageInstanceId,
    rerunAttempt: rerun.decision.verdict.workOrder?.attempt,
  }).toEqual({
    afterFinding: "routing",
    revision: ["scope-or-obligation-revision"],
    repairRequest: { stageInstanceId: "bounded-verify", debts: [testFinding] },
    acceptedBeforeRepair: 2,
    routingOrder: "route",
    repairExecutor: "qfai-atdd",
    afterRepair: "ready",
    repairClosed: undefined,
    rerunStage: "bounded-verify",
    rerunAttempt: 2,
  });
});

it("A repair outside the plan at the replan budget blocks the run", () => {
  const snapshot = verifying({ replans: 3 });
  const { decision } = step(snapshot, resultFor(snapshot, "needs_repair", [testFinding]));

  expect({ state: decision.verdict.run?.state, halt: decision.verdict.halt }).toEqual({
    state: "blocked",
    halt: { blocker: "budget-exhausted", owner: "operator", subjects: ["replan"] },
  });
});
