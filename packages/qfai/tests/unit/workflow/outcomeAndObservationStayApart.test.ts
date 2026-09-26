// QFAI:EX-0001-0192-30

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

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

it("A result with outcome unrun", () => {
  const issued = decide(
    { run: { id: "run-unrun", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  const decision =
    workOrder && run
      ? decide(
          { run, plan, flowBinding, outstandingWorkOrder: workOrder },
          {
            operation: "accept",
            result: {
              resultId: "result-direct-edit-unrun",
              workOrderId: workOrder.workOrderId,
              stageInstanceId: workOrder.stageInstanceId,
              attempt: workOrder.attempt,
              expectedSequence: run.sequence,
              outcome: "unrun",
              testObservation: "unrun",
            },
          },
          {},
        )
      : issued;
  expect({
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    eventTypes: decision.events.map((event) => event.type),
  }).toEqual({
    ok: true,
    state: "blocked",
    eventTypes: ["unrun-or-unresolved-dependency"],
  });
});
