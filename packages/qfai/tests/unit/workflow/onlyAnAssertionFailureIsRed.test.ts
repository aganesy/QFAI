// QFAI:EX-0001-0192-29
// Fault seeds: FAULT-012, FAULT-013

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const plan = {
  route: "bounded-change",
  stages: [
    {
      stageInstanceId: "bounded-sdd-delta",
      stageKind: "sdd_delta",
      skill: "qfai-sdd",
      operation: "update-or-applicability-check",
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
      stageInstanceId: "bounded-implement",
      stageKind: "implement",
      skill: "qfai-implement",
      operation: "implement",
      when: "always",
    },
    {
      stageInstanceId: "bounded-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
      when: "always",
    },
  ],
};
const flowBinding = { flowId: "BF-0007" };
const facts = { acceptanceObligationsUnmet: true };
const deltaAccepted = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
];

function acceptRed(red: NonNullable<AcceptResult["red"]>) {
  const issued = decide(
    {
      run: { id: "run-red", state: "ready", sequence: 6 },
      plan,
      flowBinding,
      acceptedStages: deltaAccepted,
    },
    { operation: "next" },
    facts,
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return { accepted: issued, next: issued };
  const accepted = decide(
    { run, plan, flowBinding, acceptedStages: deltaAccepted, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-acceptance-red",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        testObservation: "expected_red",
        red,
      },
    },
    facts,
  );
  const next = decide(
    {
      run: accepted.verdict.run ?? run,
      plan,
      flowBinding,
      acceptedStages: [
        ...deltaAccepted,
        { stageInstanceId: "bounded-acceptance", stageKind: "acceptance", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    facts,
  );
  return { accepted, next };
}

function refusal(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

function redNotAssertion() {
  return {
    state: "running",
    code: "invalid-input",
    reasons: [{ reason: "red-not-assertion", subject: "red" }],
    events: [],
  };
}

it("An acceptance result with testObservation", () => {
  const { accepted, next } = acceptRed({ testId: "TC-0007-0003", failureKind: "assertion" });
  expect({
    state: accepted.verdict.run?.state,
    nextStage: next.verdict.workOrder?.stageKind,
    nextSkill: next.verdict.workOrder?.executor?.skill,
  }).toEqual({ state: "ready", nextStage: "implement", nextSkill: "qfai-implement" });
});

it("collection", () => {
  const { accepted } = acceptRed({ testId: "TC-0007-0003", failureKind: "collection" });
  expect(refusal(accepted)).toEqual(redNotAssertion());
});

it("import", () => {
  const { accepted } = acceptRed({ testId: "TC-0007-0003", failureKind: "import" });
  expect(refusal(accepted)).toEqual(redNotAssertion());
});

it("startup", () => {
  const { accepted } = acceptRed({ testId: "TC-0007-0003", failureKind: "startup" });
  expect(refusal(accepted)).toEqual(redNotAssertion());
});

it("timeout", () => {
  const { accepted } = acceptRed({ testId: "TC-0007-0003", failureKind: "timeout" });
  expect(refusal(accepted)).toEqual(redNotAssertion());
});
