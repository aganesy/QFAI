// QFAI:EX-0001-0193-08

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const flowBinding = { flowId: "BF-0007" };
const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "always"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when,
  })),
};
const diagnosis = {
  verdict: "expectation-differs",
  reproductionRef: "evidence/expectation-reproduction.json",
  matchedIds: ["EX-0007-0002-01"],
};

it("A diagnose result expectation-differs", () => {
  const issued = decide(
    { run: { id: "run-reclassify", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const running = issued.verdict.run;
  const accepted =
    workOrder && running
      ? decide(
          { run: running, plan, flowBinding, outstandingWorkOrder: workOrder },
          {
            operation: "accept",
            result: {
              resultId: "result-diagnose",
              workOrderId: workOrder.workOrderId,
              stageInstanceId: workOrder.stageInstanceId,
              attempt: workOrder.attempt,
              expectedSequence: running.sequence,
              outcome: "accepted",
              diagnosis,
            },
          },
          {},
        )
      : issued;
  const after = accepted.verdict.run;
  const followUp = after
    ? decide(
        {
          run: after,
          plan,
          flowBinding,
          diagnosis,
          acceptedStages: [
            { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
          ],
        },
        { operation: "next" },
        {},
      )
    : accepted;

  expect({
    from: running?.state,
    to: after?.state,
    events: accepted.events.map((event) => event.type),
    implementIssued: followUp.verdict.workOrder?.stageKind === "implement",
  }).toEqual({
    from: "running",
    to: "routing",
    events: ["scope-or-obligation-revision"],
    implementIssued: false,
  });
});
