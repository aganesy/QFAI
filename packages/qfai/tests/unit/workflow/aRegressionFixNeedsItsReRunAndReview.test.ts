// QFAI:SPEC-0018:TC-0018-0068
// QFAI:SPEC-0018:TC-0018-0069

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const specBinding = { specId: "spec-0007" };
const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    [
      "bugfix-regression-fix",
      "regression_fix",
      "qfai-implement",
      "regression-fix",
      "regression_found",
    ],
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
  verdict: "regression",
  reproductionRef: "evidence/regression-reproduction.json",
  matchedRowIds: ["TDD-0004"],
};
const run = { id: "run-regression-fix", state: "running", sequence: 9 };
const workOrder = {
  workOrderId: "work-order-bugfix-regression-fix-1",
  stageInstanceId: "bugfix-regression-fix",
  attempt: 1,
  stageKind: "regression_fix",
  target: { kind: "spec" as const, specId: "spec-0007" },
  executor: { skill: "qfai-implement" },
  operation: "regression-fix",
};
const fullReceipt = {
  testId: "TC-0007-0004",
  rerunRef: "evidence/rerun-green.json",
  reviewRef: "evidence/independent-review.json",
};

function acceptRegressionFix(regressionFix: Partial<typeof fullReceipt>) {
  return decide(
    {
      run,
      plan,
      specBinding,
      diagnosis,
      acceptedStages: [
        { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      ],
      outstandingWorkOrder: workOrder,
    },
    {
      operation: "accept",
      result: {
        resultId: "result-regression-fix",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "accepted",
        regressionFix,
      },
    },
    {},
  );
}

function refusalOf(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

const refused = {
  run,
  code: "invalid-input",
  reasons: [{ reason: "regression-fix-receipt", subject: "regressionFix" }],
  events: [],
};

it("TC-0018-0068 (TDD-0085): A regression_fix result with the same test's GREEN re-run receipt and an independent review receipt", () => {
  const decision = acceptRegressionFix(fullReceipt);

  expect({
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => [event.type, event.stageInstanceId, event.outcome]),
  }).toEqual({
    ok: true,
    state: "ready",
    events: [["accept-nonfinal-result", "bugfix-regression-fix", "accepted"]],
  });
});

it("TC-0018-0069 (TDD-0086): no-rerun-receipt", () => {
  const { rerunRef: _omitted, ...withoutRerun } = fullReceipt;

  expect(refusalOf(acceptRegressionFix(withoutRerun))).toEqual(refused);
});

it("TC-0018-0069 (TDD-0087): no-review-receipt", () => {
  const { reviewRef: _omitted, ...withoutReview } = fullReceipt;

  expect(refusalOf(acceptRegressionFix(withoutReview))).toEqual(refused);
});
