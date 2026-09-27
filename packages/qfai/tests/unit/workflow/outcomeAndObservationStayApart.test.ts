// QFAI:SPEC-0018:TC-0018-0049

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
const specBinding = { specId: "spec-0007" };

it("TC-0018-0049 (TDD-0064): A result with outcome unrun", () => {
  const issued = decide(
    { run: { id: "run-unrun", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  const decision =
    workOrder && run
      ? decide(
          { run, plan, specBinding, outstandingWorkOrder: workOrder },
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
