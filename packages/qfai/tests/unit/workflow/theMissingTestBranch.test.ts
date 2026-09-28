// QFAI:EX-0001-0193-01
// QFAI:EX-0001-0193-11

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { kindSteps, planStage } from "./kindSteps.js";

type Decision = ReturnType<typeof decide>;

const flowBinding = { flowId: "BF-0018" };
const plan = {
  route: "bugfix",
  stages: [
    planStage("bugfix-diagnose", "diagnose"),
    planStage("bugfix-sdd-append", "sdd_append"),
    planStage("bugfix-acceptance", "acceptance"),
    planStage("bugfix-implement", "implement"),
    planStage("bugfix-regression-fix", "regression_fix"),
    planStage("bugfix-test-fix", "test_fix"),
    planStage("bugfix-verify", "verify"),
  ],
};
const diagnosisMatching = (matchedIds: string[]) => ({
  verdict: "missing-test",
  reproductionRef: "evidence/empty-value-reproduction.json",
  matchedIds,
});

const storyPass = {
  step: "sdd-story",
  reason: "EX-0018-0001-02 already states the empty value.",
  evidenceRef: ".qfai/report/sdd-story-pass.md",
};

// A missing-test run driven to its last stage; `matchedIds` first names the criterion or the
// example the diagnosis found, and the append stage's first result carries `appendPasses`.
function driveMissingTest(matchedIds: string[], appendPasses: (typeof storyPass)[] = []) {
  const diagnosis = diagnosisMatching(matchedIds);
  let run = { id: "run-bugfix", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let recordedDiagnosis: ReturnType<typeof diagnosisMatching> | null = null;
  const issued: { stageKind: string; steps: ReturnType<typeof kindSteps> | undefined }[] = [];
  const decisions: Decision[] = [];
  for (let index = 0; index < plan.stages.length; index++) {
    const context = { plan, flowBinding, diagnosis: recordedDiagnosis };
    const next = decide({ ...context, run, acceptedStages }, { operation: "next" }, {});
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({ stageKind: workOrder.stageKind, steps: workOrder.steps });
    const result = {
      resultId: `result-${workOrder.stageInstanceId}`,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
      ...(workOrder.stageKind === "diagnose" ? { diagnosis } : {}),
      ...(workOrder.stageKind === "sdd_append" && appendPasses.length > 0
        ? { passes: appendPasses }
        : {}),
    };
    const accepted = decide(
      { ...context, run: next.verdict.run, acceptedStages, outstandingWorkOrder: workOrder },
      { operation: "accept", result },
      {},
    );
    decisions.push(accepted);
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
  return { issued, decisions };
}

function reasonsOf(decision: Decision | undefined) {
  const error = decision?.verdict.error;
  return error && "reasons" in error ? error.reasons : [];
}

it("A diagnose result missing-test whose criterion no example states, driven to the last stage", () => {
  const { issued } = driveMissingTest(["AC-0018-0001-01"]);

  expect(issued).toEqual([
    { stageKind: "diagnose", steps: kindSteps("diagnose") },
    { stageKind: "sdd_append", steps: kindSteps("sdd_append") },
    { stageKind: "acceptance", steps: kindSteps("acceptance") },
    { stageKind: "implement", steps: kindSteps("implement") },
    { stageKind: "verify", steps: kindSteps("verify") },
  ]);
});

it("The append stage passing sdd-story while no example states the case", () => {
  const { issued, decisions } = driveMissingTest(["AC-0018-0001-01"], [storyPass]);

  expect({
    issued: issued.map((workOrder) => workOrder.stageKind),
    reasons: reasonsOf(decisions.at(-1)),
  }).toEqual({
    issued: ["diagnose", "sdd_append"],
    reasons: [{ reason: "pass-obligation-open", subject: "sdd-story" }],
  });
});

it("A diagnose result missing-test whose first matched ID is an example that states the case", () => {
  const { issued, decisions } = driveMissingTest(["EX-0018-0001-02"], [storyPass]);
  const append = decisions[1]?.events.find((event) => event.type === "accept-nonfinal-result");

  expect({
    issued: issued.map((workOrder) => workOrder.stageKind),
    passes: append?.passes,
    notRun: append?.notRun,
  }).toEqual({
    issued: ["diagnose", "sdd_append", "acceptance", "implement", "verify"],
    passes: [storyPass],
    notRun: undefined,
  });
});
