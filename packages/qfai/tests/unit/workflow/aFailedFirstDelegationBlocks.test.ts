// QFAI:EX-0001-0200-03

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

it("The first stage needing a real delegation returns delegation", () => {
  const ready = {
    run: { id: "run-first-delegation", state: "ready", sequence: 4 },
    plan: finishPlan,
    flowBinding: { flowId: "BF-0007" },
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its first work order");
  const accepted = decide(
    { ...ready, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-first-delegation",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "unrun",
        delegation: { status: "unavailable", attempt: 1 },
      },
    },
    {},
  );

  expect({ state: accepted.verdict.run?.state, halt: accepted.verdict.halt }).toEqual({
    state: "blocked",
    halt: { cause: "unsupported-capability", owner: "operator", subjects: ["delegateSubAgent"] },
  });
});
