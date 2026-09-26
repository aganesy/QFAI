// QFAI:EX-0001-0193-01
// QFAI:EX-0001-0193-11

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Decision = ReturnType<typeof decide>;

const flowBinding = { flowId: "BF-0018" };
const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    [
      "bugfix-sdd-append",
      "sdd_append",
      "qfai-sdd",
      "defect-example-seeding",
      "missing_example_needed",
    ],
    [
      "bugfix-acceptance",
      "acceptance",
      "qfai-atdd",
      "author-acceptance-tests",
      "acceptance_obligations_unmet",
    ],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "diagnosis_missing_test"],
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
const diagnosisMatching = (matchedIds: string[]) => ({
  verdict: "missing-test",
  reproductionRef: "evidence/empty-value-reproduction.json",
  matchedIds,
});

// A missing-test run driven to its last stage; `matchedIds` first names the criterion or the
// example the diagnosis found.
function driveMissingTest(appendedLayer: "Integration" | "Unit", matchedIds = ["AC-0018-0001-01"]) {
  const diagnosis = diagnosisMatching(matchedIds);
  let run = { id: "run-bugfix", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let acceptanceObligationsUnmet = false;
  let recordedDiagnosis: ReturnType<typeof diagnosisMatching> | null = null;
  const issued: { stageKind: string; skill: string | undefined; operation: string | undefined }[] =
    [];
  const events: Decision["events"] = [];
  for (let index = 0; index < plan.stages.length; index++) {
    const facts = { acceptanceObligationsUnmet };
    const context = { plan, flowBinding, diagnosis: recordedDiagnosis };
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

it("A diagnose result missing-test whose appended row's layer is Integration, driven to the last stage", () => {
  const { issued } = driveMissingTest("Integration");

  expect(issued).toEqual([
    { stageKind: "diagnose", skill: "qfai-implement", operation: "diagnose-only" },
    { stageKind: "sdd_append", skill: "qfai-sdd", operation: "defect-example-seeding" },
    { stageKind: "acceptance", skill: "qfai-atdd", operation: "author-acceptance-tests" },
    { stageKind: "implement", skill: "qfai-implement", operation: "implement" },
    { stageKind: "verify", skill: "qfai-verify", operation: "verify-full" },
  ]);
});

it("The same with the appended row's layer Unit", () => {
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

it("A diagnose result missing-test whose first matched ID is an example that states the case", () => {
  const { issued, events } = driveMissingTest("Unit", ["EX-0018-0001-02"]);

  expect({
    issued: issued.map((workOrder) => workOrder.stageKind),
    seedingNotRun: events.find(
      (event) => event.stageInstanceId === "bugfix-sdd-append" && event.notRun,
    )?.notRun?.kind,
  }).toEqual({
    issued: ["diagnose", "implement", "verify"],
    seedingNotRun: "not_applicable",
  });
});
