import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planStage } from "./kindSteps.js";

const plan = {
  route: "edit-text",
  stages: [planStage("direct-edit", "maintenance"), planStage("direct-verify", "verify")],
};
const flowBinding = { flowId: "BF-0007" };

// QFAI:EX-0001-0185-30
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
