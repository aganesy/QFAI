// QFAI:SPEC-0018:TC-0018-0063
// QFAI:SPEC-0018:TC-0018-0064

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Decision = ReturnType<typeof decide>;

const specBinding = { specId: "spec-0018" };
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
    [
      "bugfix-acceptance",
      "acceptance",
      "qfai-atdd",
      "author-acceptance-tests",
      "acceptance_obligations_unmet",
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
  verdict: "missing-test",
  reproductionRef: "evidence/empty-value-reproduction.json",
  matchedRowIds: [],
};

function driveMissingTest(appendedLayer: "Integration" | "Unit") {
  let run = { id: "run-bugfix", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let acceptanceObligationsUnmet = false;
  let recordedDiagnosis: typeof diagnosis | null = null;
  const issued: { stageKind: string; skill: string | undefined; operation: string | undefined }[] =
    [];
  const events: Decision["events"] = [];
  for (let index = 0; index < plan.stages.length; index++) {
    const facts = { acceptanceObligationsUnmet };
    const context = { plan, specBinding, diagnosis: recordedDiagnosis };
    const next = decide({ ...context, run, acceptedStages }, { operation: "next" }, facts);
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({
      stageKind: workOrder.stageKind,
      skill: workOrder.executor?.skill,
      operation: workOrder.operation,
    });
    const result = {
      resultId: `result-${workOrder.stageInstanceId}`,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
      ...(workOrder.stageKind === "diagnose" ? { diagnosis } : {}),
    };
    const accepted = decide(
      { ...context, run: next.verdict.run, acceptedStages, outstandingWorkOrder: workOrder },
      { operation: "accept", result },
      facts,
    );
    events.push(...accepted.events);
    if (!accepted.verdict.ok || !accepted.verdict.run) break;
    if (workOrder.stageKind === "diagnose") recordedDiagnosis = diagnosis;
    if (workOrder.stageKind === "sdd_append") {
      acceptanceObligationsUnmet = appendedLayer === "Integration";
    }
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
  return { issued, events };
}

it("TC-0018-0063 (TDD-0081): A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage", () => {
  const { issued } = driveMissingTest("Integration");

  expect(issued).toEqual([
    { stageKind: "diagnose", skill: "qfai-implement", operation: "diagnose-only" },
    { stageKind: "sdd_append", skill: "qfai-sdd", operation: "defect-row-seeding" },
    { stageKind: "acceptance", skill: "qfai-atdd", operation: "author-acceptance-tests" },
    { stageKind: "implement", skill: "qfai-implement", operation: "implement" },
    { stageKind: "verify", skill: "qfai-verify", operation: "verify-full" },
  ]);
});

it("TC-0018-0064 (TDD-0082): The same with the appended row's layer Unit", () => {
  const { issued, events } = driveMissingTest("Unit");
  const acceptanceRecord = events.find(
    (event) => event.stageInstanceId === "bugfix-acceptance" && event.notRun,
  );

  expect({
    issued: issued.map((workOrder) => workOrder.stageKind),
    acceptanceNotRun: acceptanceRecord?.notRun?.kind,
    acceptanceReasonGiven:
      acceptanceRecord?.notRun?.kind === "not_applicable" &&
      (acceptanceRecord.notRun.reason ?? "").trim().length > 0,
  }).toEqual({
    issued: ["diagnose", "sdd_append", "implement", "verify"],
    acceptanceNotRun: "not_applicable",
    acceptanceReasonGiven: true,
  });
});
