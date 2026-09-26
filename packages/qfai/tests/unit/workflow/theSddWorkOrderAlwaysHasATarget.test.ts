// QFAI:EX-0001-0192-04

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("Issue the SDD work order, then accept an SDD result reporting bindings for the slot", () => {
  const plan = {
    route: "feature",
    stages: [
      {
        stageInstanceId: "feature-sdd",
        stageKind: "sdd",
        skill: "qfai-sdd",
        operation: "new-story",
      },
      {
        stageInstanceId: "feature-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
      },
      {
        stageInstanceId: "feature-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
      },
    ],
  };
  const approval = {
    authorizationId: "authorization-4",
    kind: "human_decision",
    operation: "CREATE",
    effect: "proceed",
    target: { kind: "new_story", slotId: "slot-3-1" },
  };
  const binding = { slotId: "slot-3-1", flowId: "BF-0007", storyIds: ["US-0007-0001"] };

  const sddNext = decide(
    { run: { id: "run-feature", state: "ready", sequence: 5 }, plan, approval },
    { operation: "next" },
    {},
  );
  const sddOrder = sddNext.verdict.workOrder;
  const sddRun = sddNext.verdict.run;
  const accepted =
    sddOrder && sddRun
      ? decide(
          { run: sddRun, plan, approval, outstandingWorkOrder: sddOrder },
          {
            operation: "accept",
            result: {
              resultId: "result-feature-sdd",
              workOrderId: sddOrder.workOrderId,
              stageInstanceId: sddOrder.stageInstanceId,
              attempt: sddOrder.attempt,
              expectedSequence: sddRun.sequence,
              outcome: "accepted",
              bindings: [binding],
            },
          },
          {},
        )
      : null;
  const recorded = (accepted?.events ?? []).filter((event) => event.type === "binding-recorded");
  const acceptedRun = accepted?.verdict.run;
  const laterNext =
    acceptedRun && recorded[0]?.binding
      ? decide(
          {
            run: acceptedRun,
            plan,
            approval,
            flowBinding: { flowId: recorded[0].binding.flowId },
            acceptedStages: [
              { stageInstanceId: "feature-sdd", stageKind: "sdd", outcome: "accepted" },
            ],
          },
          { operation: "next" },
          {},
        )
      : null;

  const actual = {
    sddTarget: sddOrder?.target,
    bindingEvents: recorded.map((event) => event.binding),
    laterStageKind: laterNext?.verdict.workOrder?.stageKind,
    laterTarget: laterNext?.verdict.workOrder?.target,
  };
  const expected = {
    sddTarget: { kind: "new_story", slotId: "slot-3-1" },
    bindingEvents: [binding],
    laterStageKind: "implement",
    laterTarget: { kind: "flow", flowId: "BF-0007" },
  };
  expect(actual).toEqual(expected);
});
