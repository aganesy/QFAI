// QFAI:EX-0001-0193-03

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planStage } from "./kindSteps.js";

type WorkOrder = NonNullable<ReturnType<typeof decide>["verdict"]["workOrder"]>;

// The route a `regression` verdict re-routes the run to, with the stages its plan file lists.
const flowBinding = { flowId: "BF-0007" };
const plan = {
  route: "fix-red-main",
  stages: [
    { stageInstanceId: "bisect", stageKind: "diagnose", steps: [{ name: "implement-bisect" }] },
    planStage("diagnose", "diagnose"),
    planStage("fix", "regression_fix"),
    planStage("verify", "verify"),
  ],
};
const diagnosis = {
  verdict: "regression",
  reproductionRef: "evidence/regression-reproduction.json",
  matchedIds: ["EX-0007-0002-01"],
};
// The regressed example is annotated by a test, and stays so through the fix.
const facts = {
  obligations: {
    flowId: "BF-0007",
    ids: ["AC-0007-0002-01", "BF-0007", "EX-0007-0002-01", "EX-0007-0002-02"],
    exampleIds: ["EX-0007-0002-01", "EX-0007-0002-02"],
    annotated: ["EX-0007-0002-01"],
    digest: "d".repeat(64),
  },
};

const stepNames = (workOrder: WorkOrder | undefined) =>
  (workOrder?.steps ?? []).map((step) => step.name);

function resultFor(workOrder: WorkOrder, expectedSequence: number) {
  return {
    resultId: `result-${workOrder.stageInstanceId}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence,
    outcome: "accepted",
    ...(stepNames(workOrder).includes("implement-diagnose") ? { diagnosis } : {}),
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

it("A diagnose result regression for an annotated example", () => {
  let run = { id: "run-regression", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let recordedDiagnosis: typeof diagnosis | null = null;
  const issued: WorkOrder[] = [];
  for (let index = 0; index < plan.stages.length; index++) {
    const context = { plan, flowBinding, diagnosis: recordedDiagnosis };
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
    if (stepNames(workOrder).includes("implement-diagnose")) recordedDiagnosis = diagnosis;
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
  const diagnose = issued.find((workOrder) => workOrder.stageInstanceId === "diagnose");

  expect({
    issued: issued.map((workOrder) => [workOrder.stageKind, stepNames(workOrder)]),
    state: run.state,
    digestRecorded: typeof regressionFix?.obligations?.digest === "string",
    digestUnchanged: regressionFix?.obligations?.digest === diagnose?.obligations?.digest,
  }).toEqual({
    issued: [
      ["diagnose", ["implement-bisect"]],
      ["diagnose", ["implement-diagnose"]],
      ["regression_fix", ["implement-regression-fix"]],
      ["verify", ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"]],
    ],
    state: "ready",
    digestRecorded: true,
    digestUnchanged: true,
  });
});
