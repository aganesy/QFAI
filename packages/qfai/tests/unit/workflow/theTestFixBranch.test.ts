// QFAI:EX-0001-0194-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { kindSteps, planStage } from "./kindSteps.js";

// The route a `defective-test` verdict re-routes the run to, with the stages its plan file lists.
const plan = {
  route: "repair-test",
  stages: [
    planStage("diagnose", "diagnose"),
    planStage("fix", "test_fix"),
    planStage("verify", "verify"),
  ],
};
const diagnosed = [{ stageInstanceId: "diagnose", stageKind: "diagnose", outcome: "accepted" }];

// The run after its diagnose stage found a defective test whose first matched ID is
// `firstMatched`.
function diagnosedRun(firstMatched: string) {
  return {
    run: { id: "run-test-fix", state: "ready", sequence: 6 },
    plan,
    flowBinding: { flowId: "BF-0007" },
    diagnosis: {
      verdict: "defective-test",
      reproductionRef: "evidence/defective-test.json",
      matchedIds: [firstMatched, "EX-0007-0002-02"],
    },
    acceptedStages: diagnosed,
  };
}

// The fix work order the diagnosed run issues next.
function testFixStepsFor(firstMatched: string) {
  const decision = decide(diagnosedRun(firstMatched), { operation: "next" }, {});
  const workOrder = decision.verdict.workOrder;
  return [workOrder?.stageKind, workOrder?.steps];
}

// Both test-fix steps run whatever the layer; the one that does not own the layer passes.
const matrix: [string, string][] = [
  ["business-flow", "BF-0007"],
  ["acceptance-criterion", "AC-0007-0002-01"],
  ["example", "EX-0007-0002-01"],
];

for (const [title, firstMatched] of matrix) {
  it(title, () => {
    expect(testFixStepsFor(firstMatched)).toEqual(["test_fix", kindSteps("test_fix")]);
  });
}

it("A criterion-first fix that repairs the test and passes implement-test-fix, then verify", () => {
  const ready = diagnosedRun("AC-0007-0002-01");
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the diagnosed run issues its fix work order");
  const cited = { ids: ["AC-0007-0002-01", "EX-0007-0002-01"], digest: "a".repeat(64) };
  const accepted = decide(
    { ...ready, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-fix",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        passes: [
          {
            step: "implement-test-fix",
            reason: "The acceptance test owns the flaky wait; no example changes.",
            evidenceRef: "evidence/implement-test-fix-pass.md",
          },
        ],
        testFix: {
          citedBefore: cited,
          citedAfter: cited,
          reviewRef: "evidence/test-fix-review.json",
          rerunRef: "evidence/test-fix-rerun.json",
        },
      },
    },
    {},
  );
  const fixed = [
    ...diagnosed,
    { stageInstanceId: "fix", stageKind: "test_fix", outcome: "accepted" },
  ];
  const next = decide(
    { ...ready, run: accepted.verdict.run ?? run, acceptedStages: fixed },
    { operation: "next" },
    {},
  );

  expect({
    state: accepted.verdict.run?.state,
    next: [next.verdict.workOrder?.stageInstanceId, next.verdict.workOrder?.stageKind],
  }).toEqual({ state: "ready", next: ["verify", "verify"] });
});
