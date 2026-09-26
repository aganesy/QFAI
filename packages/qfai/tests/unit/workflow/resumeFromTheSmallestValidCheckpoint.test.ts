// QFAI:EX-0001-0196-04

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

it("resume facts where one receipt's dependency cannot be read", () => {
  const resumed = decide(
    {
      run: { id: "run-resume", state: "running", sequence: 9 },
      plan: finishPlan,
      flowBinding: { flowId: "BF-0007" },
      acceptedStages: [
        {
          stageInstanceId: "bounded-sdd-delta",
          stageKind: "sdd_delta",
          outcome: "accepted",
          receiptRef: "receipts/bounded-sdd-delta-1.json",
        },
      ],
      attempts: { "bounded-sdd-delta": 1, "bounded-implement": 1 },
      outstandingWorkOrder: {
        workOrderId: "work-order-bounded-implement-1",
        stageInstanceId: "bounded-implement",
        attempt: 1,
        stageKind: "implement",
      },
    },
    { operation: "resume" },
    { receiptValidity: { "receipts/bounded-sdd-delta-1.json": "unknown" } },
  );

  expect({
    receipts: resumed.verdict.classedReceipts,
    stage: resumed.verdict.workOrder?.stageInstanceId,
    attempt: resumed.verdict.workOrder?.attempt,
    state: resumed.verdict.run?.state,
  }).toEqual({
    receipts: [{ ref: "receipts/bounded-sdd-delta-1.json", validity: "unknown" }],
    stage: "bounded-sdd-delta",
    attempt: 2,
    state: "running",
  });
});
