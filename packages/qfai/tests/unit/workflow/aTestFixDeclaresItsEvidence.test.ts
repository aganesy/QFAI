// QFAI:SPEC-0018:TC-0018-0078
// QFAI:SPEC-0018:TC-0018-0083

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    ["bugfix-test-fix", "test_fix", "qfai-atdd", "test-fix", "test_defect_found"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when,
  })),
};
const run = { id: "run-test-fix", state: "running", sequence: 8 };
const workOrder = {
  workOrderId: "work-order-bugfix-test-fix-1",
  stageInstanceId: "bugfix-test-fix",
  attempt: 1,
  stageKind: "test_fix",
  target: { kind: "spec" as const, specId: "spec-0007" },
  executor: { skill: "qfai-implement" },
  operation: "test-fix",
};
const facts = {
  ledger: {
    specId: "spec-0007",
    rows: [
      {
        rowId: "TDD-0004",
        status: "done",
        digest: "4".repeat(64),
        layer: "Unit",
        tcLevels: ["L1"],
      },
    ],
  },
};
const completeFix = {
  citedBefore: "AC-0007-0002: an empty value is refused with 400",
  citedAfter: "AC-0007-0002: an empty value is refused with 400",
  reviewRef: "evidence/test-fix-review.json",
  rerunRef: "evidence/test-fix-rerun.json",
};

function acceptTestFix(testFix: Partial<typeof completeFix>) {
  return decide(
    {
      run,
      plan,
      specBinding: { specId: "spec-0007" },
      diagnosis: {
        verdict: "defective-test",
        reproductionRef: "evidence/defective-test.json",
        matchedRowIds: ["TDD-0004"],
      },
      acceptedStages: [
        { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      ],
      outstandingWorkOrder: workOrder,
    },
    {
      operation: "accept",
      result: {
        resultId: "result-test-fix",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "accepted",
        testFix,
      },
    },
    facts,
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
  reasons: [{ reason: "test-fix-receipt", subject: "testFix" }],
  events: [],
};

it("TC-0018-0078 (TDD-0097): A test_fix result with citedBefore equal to citedAfter, a review receipt and a re-run receipt", () => {
  const decision = acceptTestFix(completeFix);

  expect({
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => [event.type, event.stageInstanceId]),
  }).toEqual({
    ok: true,
    state: "ready",
    events: [["accept-nonfinal-result", "bugfix-test-fix"]],
  });
});

it("TC-0018-0083 (TDD-0102): no-review-ref", () => {
  const { reviewRef: _omitted, ...withoutReview } = completeFix;

  expect(refusalOf(acceptTestFix(withoutReview))).toEqual(refused);
});

it("TC-0018-0083 (TDD-0103): no-rerun-ref", () => {
  const { rerunRef: _omitted, ...withoutRerun } = completeFix;

  expect(refusalOf(acceptTestFix(withoutRerun))).toEqual(refused);
});
