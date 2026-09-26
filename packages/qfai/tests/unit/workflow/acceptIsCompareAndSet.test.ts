// QFAI:EX-0001-0192-32
// Fault seeds: FAULT-004

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const plan = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-edit",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "non-normative-edit",
    },
    {
      stageInstanceId: "direct-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const flowBinding = { flowId: "BF-0007" };

function acceptChanged(change: Partial<AcceptResult>) {
  const issued = decide(
    { run: { id: "run-cas", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return issued;
  return decide(
    { run, plan, flowBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-direct-edit",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        ...change,
      },
    },
    {},
  );
}

it("A result whose expectedSequence is behind the run's", () => {
  const decision = acceptChanged({ expectedSequence: 5 });
  expect({
    run: decision.verdict.run,
    code: decision.verdict.error?.code,
    events: decision.events,
  }).toEqual({
    run: { id: "run-cas", state: "running", sequence: 6 },
    code: "stale-sequence",
    events: [],
  });
});

it("A result naming a work order other than the outstanding one", () => {
  const decision = acceptChanged({ workOrderId: "work-order-direct-verify-1" });
  const error = decision.verdict.error;
  expect({
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  }).toEqual({
    code: "invalid-input",
    reasons: [{ reason: "work-order", subject: "workOrderId" }],
    events: [],
  });
});
