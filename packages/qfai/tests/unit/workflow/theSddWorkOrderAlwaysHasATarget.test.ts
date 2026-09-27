// QFAI:SPEC-0018:TC-0018-0005

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("TC-0018-0005 (TDD-0005): Issue the SDD work order, then accept an SDD result reporting bindings for the slot", () => {
  const plan = {
    route: "feature",
    stages: [
      {
        stageInstanceId: "feature-sdd",
        stageKind: "sdd",
        skill: "qfai-sdd",
        operation: "new-capability",
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
    target: { kind: "new_capability", slotId: "slot-3-1" },
  };
  const binding = { slotId: "slot-3-1", capabilityId: "CAP-0001", specId: "spec-0007" };

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
            specBinding: { specId: recorded[0].binding.specId },
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
    sddTarget: { kind: "new_capability", slotId: "slot-3-1" },
    bindingEvents: [binding],
    laterStageKind: "implement",
    laterTarget: { kind: "spec", specId: "spec-0007" },
  };
  expect(actual).toEqual(expected);
});
