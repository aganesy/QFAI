// QFAI:EX-0001-0192-27
// Fault seeds: FAULT-014

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;
type WorkOrder = NonNullable<ReturnType<typeof decide>["verdict"]["workOrder"]>;

const plan = {
  route: "bounded-change",
  stages: [
    {
      stageInstanceId: "bounded-sdd-delta",
      stageKind: "sdd_delta",
      skill: "qfai-sdd",
      operation: "update-or-applicability-check",
      when: "always",
    },
    {
      stageInstanceId: "bounded-acceptance",
      stageKind: "acceptance",
      skill: "qfai-atdd",
      operation: "author-acceptance-tests",
      when: "acceptance_obligations_unmet",
    },
    {
      stageInstanceId: "bounded-implement",
      stageKind: "implement",
      skill: "qfai-implement",
      operation: "implement",
      when: "always",
    },
    {
      stageInstanceId: "bounded-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
      when: "always",
    },
  ],
};
const facts = { acceptanceObligationsUnmet: true };
const base = {
  plan,
  flowBinding: { flowId: "BF-0007" },
  acceptedStages: [
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  ],
};

function resultFor(
  workOrder: WorkOrder,
  expectedSequence: number,
  fields: Partial<AcceptResult>,
): AcceptResult {
  return {
    resultId: `result-${workOrder.workOrderId}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence,
    outcome: "accepted",
    ...fields,
  };
}

function nextFrom(snapshot: Snapshot) {
  const next = decide(snapshot, { operation: "next" }, facts);
  return { run: next.verdict.run, workOrder: next.verdict.workOrder };
}

function summary(workOrder: WorkOrder | null | undefined) {
  if (!workOrder) return null;
  return {
    stageInstanceId: workOrder.stageInstanceId,
    stageKind: workOrder.stageKind,
    attempt: workOrder.attempt,
    skill: workOrder.executor?.skill,
    operation: workOrder.operation,
    parentWorkOrderId: workOrder.parentWorkOrderId,
  };
}

const stopped = { id: "run-seam", state: "stopped", sequence: -1 };

it("An acceptance result with seamRequest and outcome needs_repair", () => {
  const targetTestId = "TC-0007-0003";
  const first = nextFrom({ ...base, run: { id: "run-seam", state: "ready", sequence: 6 } });
  const acceptance = first.workOrder;
  const acceptanceId = acceptance?.workOrderId ?? "none";
  const repair = acceptance
    ? decide(
        { ...base, run: first.run ?? stopped, outstandingWorkOrder: acceptance },
        {
          operation: "accept",
          result: resultFor(acceptance, first.run?.sequence ?? -1, {
            outcome: "needs_repair",
            seamRequest: { targetTestId },
          }),
        },
        facts,
      ).verdict
    : undefined;
  const seamRequest = {
    parentWorkOrderId: acceptanceId,
    stageInstanceId: "bounded-acceptance",
    attempt: 1,
    targetTestId,
  };

  const seamNext = nextFrom({ ...base, run: repair?.run ?? stopped, seamRequest });
  const seamOrder = seamNext.workOrder;
  const seamAccepted = seamOrder
    ? decide(
        { ...base, run: seamNext.run ?? stopped, seamRequest, outstandingWorkOrder: seamOrder },
        {
          operation: "accept",
          result: resultFor(seamOrder, seamNext.run?.sequence ?? -1, {
            seam: { targetTestId, observation: "fail" },
          }),
        },
        facts,
      ).verdict
    : undefined;

  const returned = nextFrom({
    ...base,
    run: seamAccepted?.run ?? stopped,
    attempts: { "bounded-acceptance": 1 },
  });

  expect({
    repairState: repair?.run?.state,
    seamOrder: summary(seamOrder),
    seamAcceptedState: seamAccepted?.run?.state,
    returned: summary(returned.workOrder),
  }).toEqual({
    repairState: "ready",
    seamOrder: {
      stageInstanceId: expect.any(String),
      stageKind: "implement",
      attempt: 1,
      skill: "qfai-implement",
      operation: "seam-only",
      parentWorkOrderId: acceptanceId,
    },
    seamAcceptedState: "ready",
    returned: {
      stageInstanceId: "bounded-acceptance",
      stageKind: "acceptance",
      attempt: 2,
      skill: "qfai-atdd",
      operation: "author-acceptance-tests",
      parentWorkOrderId: undefined,
    },
  });
});
