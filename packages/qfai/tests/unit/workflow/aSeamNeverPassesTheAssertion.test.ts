// QFAI:SPEC-0018:TC-0018-0046

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const base = {
  plan: {
    route: "bounded-change",
    stages: [
      {
        stageInstanceId: "bounded-sdd-delta",
        stageKind: "sdd_delta",
        skill: "qfai-sdd",
        operation: "delta-or-applicability-check",
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
        stageInstanceId: "bounded-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        when: "always",
      },
    ],
  },
  specBinding: { specId: "spec-0007" },
  acceptedStages: [
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  ],
  seamRequest: {
    parentWorkOrderId: "work-order-bounded-acceptance-1",
    stageInstanceId: "bounded-acceptance",
    attempt: 1,
    targetTestId: "TC-0007-0003",
  },
};
const facts = { acceptanceObligationsUnmet: true };

it("TC-0018-0046 (TDD-0058): A seam-only result whose seam", () => {
  const issued = decide(
    { ...base, run: { id: "run-seam-pass", state: "ready", sequence: 8 } },
    { operation: "next" },
    facts,
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  const decision =
    workOrder && run
      ? decide(
          { ...base, run, outstandingWorkOrder: workOrder },
          {
            operation: "accept",
            result: {
              resultId: "result-seam-pass",
              workOrderId: workOrder.workOrderId,
              stageInstanceId: workOrder.stageInstanceId,
              attempt: workOrder.attempt,
              expectedSequence: run.sequence,
              outcome: "accepted",
              seam: { targetTestId: "TC-0007-0003", observation: "pass" },
            },
          },
          facts,
        )
      : issued;
  const error = decision.verdict.error;
  expect({
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  }).toEqual({
    run: { id: "run-seam-pass", state: "running", sequence: 10 },
    code: "invalid-input",
    reasons: [{ reason: "seam-passed", subject: "seam" }],
    events: [],
  });
});
