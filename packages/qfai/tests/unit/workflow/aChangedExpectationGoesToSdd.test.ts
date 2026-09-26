// QFAI:EX-0001-0194-04
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
const target: { kind: "flow"; flowId: string } = { kind: "flow", flowId: "BF-0007" };
const workOrder = {
  workOrderId: "work-order-bugfix-test-fix-1",
  stageInstanceId: "bugfix-test-fix",
  attempt: 1,
  stageKind: "test_fix",
  target,
  executor: { skill: "qfai-implement" },
  operation: "test-fix",
};
// An example ID first: the test fix goes to `qfai-implement`.
const facts = {};

it("A test_fix result whose citedAfter differs from citedBefore", () => {
  const decision = decide(
    {
      run,
      plan,
      flowBinding: { flowId: "BF-0007" },
      diagnosis: {
        verdict: "defective-test",
        reproductionRef: "evidence/defective-test.json",
        matchedIds: ["EX-0007-0002-01"],
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
          citedBefore: { ids: ["AC-0007-0002-01", "EX-0007-0002-01"], digest: "a".repeat(64) },
          citedAfter: { ids: ["AC-0007-0002-01", "EX-0007-0002-01"], digest: "b".repeat(64) },
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
