// QFAI:SPEC-0018:TC-0018-0067

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type WorkOrder = NonNullable<ReturnType<typeof decide>["verdict"]["workOrder"]>;

const specBinding = { specId: "spec-0007" };
const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    [
      "bugfix-sdd-append",
      "sdd_append",
      "qfai-sdd",
      "defect-row-seeding",
      "missing_test_row_needed",
    ],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "missing_test_row_needed"],
    [
      "bugfix-regression-fix",
      "regression_fix",
      "qfai-implement",
      "regression-fix",
      "regression_found",
    ],
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
const diagnosis = {
  verdict: "regression",
  reproductionRef: "evidence/regression-reproduction.json",
  matchedRowIds: ["TDD-0004"],
};
const facts = {
  ledger: {
    specId: "spec-0007",
    rows: [
      { rowId: "TDD-0004", status: "done", digest: "d".repeat(64) },
      { rowId: "TDD-0005", status: "todo", digest: "e".repeat(64) },
    ],
  },
};

function resultFor(workOrder: WorkOrder, expectedSequence: number) {
  return {
    resultId: `result-${workOrder.stageInstanceId}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence,
    outcome: "accepted",
    ...(workOrder.stageKind === "diagnose" ? { diagnosis } : {}),
    ...(workOrder.stageKind === "regression_fix"
      ? {
          regressionFix: {
            testId: "TC-0007-0004",
            rerunRef: "evidence/rerun-green.json",
            reviewRef: "evidence/independent-review.json",
          },
        }
      : {}),
  };
}

it("TC-0018-0067 (TDD-0084): A diagnose result regression for a done row", () => {
  let run = { id: "run-regression", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let recordedDiagnosis: typeof diagnosis | null = null;
  const issued: WorkOrder[] = [];
  for (let index = 0; index < plan.stages.length; index++) {
    const context = { plan, specBinding, diagnosis: recordedDiagnosis };
    const next = decide({ ...context, run, acceptedStages }, { operation: "next" }, facts);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push(workOrder);
    const accepted = decide(
      { ...context, run: next.verdict.run, acceptedStages, outstandingWorkOrder: workOrder },
      { operation: "accept", result: resultFor(workOrder, next.verdict.run.sequence) },
      facts,
    );
    if (!accepted.verdict.ok || !accepted.verdict.run) break;
    if (workOrder.stageKind === "diagnose") recordedDiagnosis = diagnosis;
    acceptedStages = [
      ...acceptedStages,
      {
        stageInstanceId: workOrder.stageInstanceId,
        stageKind: workOrder.stageKind,
        outcome: "accepted",
      },
    ];
    run = accepted.verdict.run;
  }
  const regressionFix = issued.find((workOrder) => workOrder.stageKind === "regression_fix");
  const verify = issued.find((workOrder) => workOrder.stageKind === "verify");

  expect({
    issued: issued.map(({ stageKind, executor, operation }) => [
      stageKind,
      executor?.skill,
      operation,
    ]),
    digestRecorded: typeof regressionFix?.ledger?.rowSetDigest === "string",
    digestUnchanged: regressionFix?.ledger?.rowSetDigest === verify?.ledger?.rowSetDigest,
  }).toEqual({
    issued: [
      ["diagnose", "qfai-implement", "diagnose-only"],
      ["regression_fix", "qfai-implement", "regression-fix"],
      ["verify", "qfai-verify", "verify-full"],
    ],
    digestRecorded: true,
    digestUnchanged: true,
  });
});
