// QFAI:SPEC-0018:TC-0018-0153

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

const specBinding = { specId: "spec-0007" };
const acceptedStages = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
];
// The test fails because the example it asserts is wrong, so the spec's owner repairs it.
const failingExample = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/spec-0007/05_Examples.md",
  cause: "The example the failing test asserts contradicts its business rule",
  owningSpec: "spec-0007",
  detectingCommand: "vitest run",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

it("TC-0018-0153 (TDD-0207): An implement result with testObservation", () => {
  const run = { id: "run-test-failure", state: "running", sequence: 8 };
  const implementOrder = {
    workOrderId: "work-order-bounded-implement-1",
    stageInstanceId: "bounded-implement",
    attempt: 1,
    stageKind: "implement",
    target: { kind: "spec" as const, specId: "spec-0007" },
    executor: { skill: "qfai-implement" },
    operation: "implement",
  };
  const snapshot = {
    run,
    plan: finishPlan,
    specBinding,
    acceptedStages,
    attempts: { "bounded-sdd-delta": 1, "bounded-implement": 1 },
  };
  const accepted = decide(
    { ...snapshot, outstandingWorkOrder: implementOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-implement-fail",
        workOrderId: implementOrder.workOrderId,
        stageInstanceId: implementOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "needs_repair",
        testObservation: "fail",
        debts: [failingExample],
      },
    },
    {},
  );
  const repairs = accepted.events.find((event) => event.type === "accept-nonfinal-result")?.repairs;
  const ready = accepted.verdict.run;
  if (!ready || !repairs) throw new Error("the failing implement result is accepted for repair");
  const next = decide(
    {
      ...snapshot,
      run: ready,
      repairRequest: { stageInstanceId: implementOrder.stageInstanceId, debts: repairs },
    },
    { operation: "next" },
    {},
  );

  expect({
    retries: [accepted.verdict.retry, next.verdict.retry],
    executor: next.verdict.workOrder?.executor?.skill,
    stageInstanceId: next.verdict.workOrder?.stageInstanceId,
  }).toEqual({
    retries: [undefined, undefined],
    executor: "qfai-sdd",
    stageInstanceId: "bounded-sdd-delta",
  });
});
