// QFAI:EX-0001-0196-16

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

it("Decide resume on a run in running whose outstanding work order has no accepted result", () => {
  const outstanding = {
    workOrderId: "work-order-bounded-sdd-delta-1",
    stageInstanceId: "bounded-sdd-delta",
    attempt: 1,
    stageKind: "sdd_delta",
  };
  const resumed = decide(
    {
      run: { id: "run-interrupted", state: "running", sequence: 5 },
      plan: finishPlan,
      flowBinding: { flowId: "BF-0007" },
      outstandingWorkOrder: outstanding,
    },
    { operation: "resume" },
    {},
  );
  const types = resumed.events.map((event) => event.type);

  expect({
    interruptedThenReconciled: types.slice(0, 2),
    workOrder: resumed.verdict.workOrder,
  }).toEqual({
    interruptedThenReconciled: ["observed-session-interruption", "reconciled-resume"],
    workOrder: outstanding,
  });
});
