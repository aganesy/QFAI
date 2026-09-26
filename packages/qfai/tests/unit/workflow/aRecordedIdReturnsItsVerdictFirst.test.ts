// QFAI:SPEC-0018:TC-0018-0051
// Fault seeds: FAULT-003

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Decision = ReturnType<typeof decide>;
type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const featurePlan = {
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

function acceptThenResubmit(resubmittedDigest: string) {
  const sddNext = decide(
    { run: { id: "run-replay", state: "ready", sequence: 5 }, plan: featurePlan, approval },
    { operation: "next" },
    {},
  );
  const sddOrder = sddNext.verdict.workOrder;
  const sddRun = sddNext.verdict.run;
  if (!sddOrder || !sddRun) return { first: sddNext, replay: sddNext };
  const result: AcceptResult = {
    resultId: "result-feature-sdd",
    workOrderId: sddOrder.workOrderId,
    stageInstanceId: sddOrder.stageInstanceId,
    attempt: sddOrder.attempt,
    expectedSequence: sddRun.sequence,
    outcome: "accepted",
    bindings: [binding],
  };
  const first = decide(
    { run: sddRun, plan: featurePlan, approval, outstandingWorkOrder: sddOrder },
    { operation: "accept", result, payloadDigest: "digest-first" },
    {},
  );
  const acceptedStages = [
    { stageInstanceId: "feature-sdd", stageKind: "sdd", outcome: "accepted" },
  ];
  const movedOn = decide(
    {
      run: first.verdict.run ?? sddRun,
      plan: featurePlan,
      approval,
      acceptedStages,
      specBinding: { specId: binding.specId },
    },
    { operation: "next" },
    {},
  );
  const replay = decide(
    {
      run: movedOn.verdict.run ?? sddRun,
      plan: featurePlan,
      approval,
      acceptedStages,
      specBinding: { specId: binding.specId },
      ...(movedOn.verdict.workOrder ? { outstandingWorkOrder: movedOn.verdict.workOrder } : {}),
      recordedResults: {
        [result.resultId]: { payloadDigest: "digest-first", verdict: first.verdict },
      },
    },
    { operation: "accept", result, payloadDigest: resubmittedDigest },
    {},
  );
  return { first, replay };
}

function refusal(decision: Decision) {
  const error = decision.verdict.error;
  return {
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

it("TC-0018-0051 (TDD-0065): Resubmit the accepted SDD result with the same resultId after the run moved on, its expected sequence now stale", () => {
  const { first, replay } = acceptThenResubmit("digest-first");
  expect(first.events.filter((event) => event.type === "binding-recorded")).toHaveLength(1);
  expect({ verdict: replay.verdict, events: replay.events }).toEqual({
    verdict: first.verdict,
    events: [],
  });
});

// QFAI:SPEC-0018:TC-0018-0052
it("TC-0018-0052 (TDD-0066): The recorded resultId with a different payload digest", () => {
  const { replay } = acceptThenResubmit("digest-second");
  expect(refusal(replay)).toEqual({
    code: "invalid-input",
    reasons: [{ reason: "result-id-reused", subject: "resultId" }],
    events: [],
  });
});

const directPlan = {
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
const specBinding = { specId: "spec-0007" };

function acceptWithId(resultId: string) {
  const issued = decide(
    { run: { id: "run-result-id", state: "ready", sequence: 4 }, plan: directPlan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return issued;
  return decide(
    { run, plan: directPlan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId,
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
      },
    },
    {},
  );
}

const schemaRefusal = {
  code: "invalid-input",
  reasons: [{ reason: "schema", subject: "resultId" }],
  events: [],
};

// QFAI:SPEC-0018:TC-0018-0053
it("TC-0018-0053 (TDD-0067): length-1", () => {
  expect(acceptWithId("a").verdict.run?.state).toBe("ready");
});

it("TC-0018-0053 (TDD-0068): length-64", () => {
  expect(acceptWithId(`${"A1._-".repeat(12)}abcd`).verdict.run?.state).toBe("ready");
});

it("TC-0018-0053 (TDD-0069): empty", () => {
  expect(refusal(acceptWithId(""))).toEqual(schemaRefusal);
});

it("TC-0018-0053 (TDD-0070): length-65", () => {
  expect(refusal(acceptWithId("a".repeat(65)))).toEqual(schemaRefusal);
});

it("TC-0018-0053 (TDD-0071): outside-char", () => {
  expect(refusal(acceptWithId("result/edit"))).toEqual(schemaRefusal);
});
