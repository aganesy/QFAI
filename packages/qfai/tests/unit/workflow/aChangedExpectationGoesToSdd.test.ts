// QFAI:SPEC-0018:TC-0018-0081
// Fault seeds: FAULT-016

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
const target: { kind: "spec"; specId: string } = { kind: "spec", specId: "spec-0007" };
const workOrder = {
  workOrderId: "work-order-bugfix-test-fix-1",
  stageInstanceId: "bugfix-test-fix",
  attempt: 1,
  stageKind: "test_fix",
  target,
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

it("TC-0018-0081 (TDD-0100): A test_fix result whose citedAfter differs from citedBefore", () => {
  const decision = decide(
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
        testFix: {
          citedBefore: "AC-0007-0002: an empty value is refused with 400",
          citedAfter: "AC-0007-0002: an empty value is refused with 422",
          reviewRef: "evidence/test-fix-review.json",
          rerunRef: "evidence/test-fix-rerun.json",
        },
      },
    },
    facts,
  );
  const error = decision.verdict.error;

  expect({
    ok: decision.verdict.ok,
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  }).toEqual({
    ok: false,
    run,
    code: "invalid-input",
    reasons: [{ reason: "test-fix-meaning", subject: "testFix" }],
    events: [],
  });
});
