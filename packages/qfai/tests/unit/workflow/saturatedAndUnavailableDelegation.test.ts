// QFAI:SPEC-0018:TC-0018-0151
// QFAI:SPEC-0018:TC-0018-0152

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowDecision } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type WorkOrder = NonNullable<WorkflowDecision["verdict"]["workOrder"]>;

const specBinding = { specId: "spec-0007" };

function running(acceptedStages: NonNullable<Snapshot["acceptedStages"]> = []) {
  const ready: Snapshot = {
    run: { id: "run-delegation", state: "ready", sequence: 4 },
    plan: finishPlan,
    specBinding,
    acceptedStages,
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues a work order");
  return { ...ready, run, outstandingWorkOrder: workOrder };
}

function delegationResult(workOrder: WorkOrder, sequence: number, status: string, n: number) {
  return {
    operation: "accept",
    result: {
      resultId: `result-delegation-${n}`,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: sequence,
      outcome: "unrun",
      delegation: { status, attempt: workOrder.attempt },
    },
  };
}

it("TC-0018-0151 (TDD-0205): Four results in turn with delegation", () => {
  let snapshot: Snapshot & { outstandingWorkOrder: WorkOrder } = running();
  const workOrderId = snapshot.outstandingWorkOrder.workOrderId;
  const seen: unknown[] = [];
  for (let n = 1; n <= 4; n++) {
    const decision = decide(
      snapshot,
      delegationResult(snapshot.outstandingWorkOrder, snapshot.run.sequence, "saturated", n),
      {},
    );
    const { run, workOrder, retry, halt } = decision.verdict;
    seen.push({ state: run?.state, workOrderId: workOrder?.workOrderId, retry, halt });
    if (!run || !workOrder) break;
    snapshot = {
      ...snapshot,
      run,
      outstandingWorkOrder: workOrder,
      delegationRetries: (snapshot.delegationRetries ?? 0) + 1,
    };
  }

  expect(seen).toEqual([
    { state: "running", workOrderId, retry: { attempt: 2, nextDelaySeconds: 30 }, halt: undefined },
    { state: "running", workOrderId, retry: { attempt: 3, nextDelaySeconds: 60 }, halt: undefined },
    {
      state: "running",
      workOrderId,
      retry: { attempt: 4, nextDelaySeconds: 120 },
      halt: undefined,
    },
    {
      state: "blocked",
      workOrderId: undefined,
      retry: undefined,
      halt: { blocker: "budget-exhausted", owner: "operator", subjects: [workOrderId] },
    },
  ]);
});

it("TC-0018-0152 (TDD-0206): A delegation unavailable on a stage after the first delegated one", () => {
  const snapshot = running([
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  ]);
  const decision = decide(
    snapshot,
    delegationResult(snapshot.outstandingWorkOrder, snapshot.run.sequence, "unavailable", 1),
    {},
  );

  expect({
    state: decision.verdict.run?.state,
    retry: decision.verdict.retry,
    halt: decision.verdict.halt,
  }).toEqual({
    state: "blocked",
    retry: undefined,
    halt: { blocker: "delegation-unavailable", owner: "operator", subjects: ["delegateSubAgent"] },
  });
});
