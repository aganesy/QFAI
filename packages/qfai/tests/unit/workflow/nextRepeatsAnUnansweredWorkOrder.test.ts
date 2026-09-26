// QFAI:EX-0001-0192-12

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("next twice on a run in running, then resume twice, with no result between", () => {
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
  const issued = decide(
    { run: { id: "run-direct", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const outstanding = issued.verdict.workOrder;
  const running = issued.verdict.run;
  const ids: (string | undefined)[] = [];
  if (outstanding && running) {
    let snapshot = { run: running, plan, flowBinding, outstandingWorkOrder: outstanding };
    for (const operation of ["next", "next", "resume", "resume"]) {
      const decision = decide(snapshot, { operation }, {});
      ids.push(decision.verdict.workOrder?.workOrderId);
      if (decision.verdict.run) snapshot = { ...snapshot, run: decision.verdict.run };
    }
  }

  expect({ first: outstanding?.workOrderId, ids }).toEqual({
    first: "work-order-direct-edit-1",
    ids: Array.from({ length: 4 }, () => "work-order-direct-edit-1"),
  });
});
