// QFAI:SPEC-0018:TC-0018-0082

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  })),
};
const specBinding = { specId: "spec-0007" };
const acceptedStages = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
];
const specFinding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/spec-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningSpec: "spec-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

it("TC-0018-0082 (TDD-0101): A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd", () => {
  const run = { id: "run-repair", state: "running", sequence: 12 };
  const verifyOrder = {
    workOrderId: "work-order-bounded-verify-1",
    stageInstanceId: "bounded-verify",
    attempt: 1,
    stageKind: "verify",
    executor: { skill: "qfai-verify" },
    operation: "verify-full",
  };
  const accepted = decide(
    { run, plan, specBinding, acceptedStages, outstandingWorkOrder: verifyOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-verify-repair",
        workOrderId: verifyOrder.workOrderId,
        stageInstanceId: verifyOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "needs_repair",
        debts: [specFinding],
      },
    },
    {},
  );
  const acceptEvent = accepted.events.find((event) => event.type === "accept-nonfinal-result");
  const repairRequest =
    acceptEvent?.stageInstanceId && acceptEvent.repairs
      ? { stageInstanceId: acceptEvent.stageInstanceId, debts: acceptEvent.repairs }
      : undefined;
  const next = accepted.verdict.run
    ? decide(
        {
          run: accepted.verdict.run,
          plan,
          specBinding,
          acceptedStages,
          attempts: { "bounded-sdd-delta": 1, "bounded-implement": 1, "bounded-verify": 1 },
          ...(repairRequest ? { repairRequest } : {}),
        },
        { operation: "next" },
        {},
      )
    : accepted;

  expect({
    state: accepted.verdict.run?.state,
    executor: next.verdict.workOrder?.executor?.skill,
    stageKind: next.verdict.workOrder?.stageKind,
  }).toEqual({ state: "ready", executor: "qfai-sdd", stageKind: "sdd_delta" });
});
