// QFAI:AC-0001-0216-01
// QFAI:AC-0001-0216-02
// QFAI:AC-0001-0216-03

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { PlanStep } from "../../../src/core/workflow/types.js";
import { kindSteps, planStage } from "../../unit/workflow/kindSteps.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Facts = Parameters<typeof decide>[2];

const FLOW = "BF-0001";
const EXAMPLES =
  ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";

const passThrough = (name: string): PlanStep => ({ name, passThrough: true });

// A story-authoring stage laid out the way the add-feature route lists its steps.
const SDD_STEPS: PlanStep[] = [
  { name: "sdd-triage" },
  passThrough("sdd-flow"),
  { name: "sdd-story" },
  passThrough("sdd-contract"),
  passThrough("common-design-md"),
  passThrough("sdd-cycle"),
  { name: "sdd-gate" },
];

const addFeaturePlan = (sddSteps: PlanStep[] = SDD_STEPS) => ({
  route: "add-feature",
  writeScope: ["src/**", ".qfai/spec/02_business-flow/business-flow-0001/**"],
  stages: [
    { stageInstanceId: "sdd", stageKind: "sdd", steps: sddSteps },
    planStage("acceptance", "acceptance"),
    planStage("implement", "implement"),
    planStage("docs", "maintenance"),
    planStage("verify", "verify"),
  ],
});

const fixDefectPlan = {
  route: "fix-defect",
  writeScope: ["src/**", "tests/**"],
  stages: [
    planStage("diagnose", "diagnose"),
    planStage("spec", "sdd_append"),
    planStage("acceptance", "acceptance"),
    planStage("implement", "implement"),
    planStage("verify", "verify"),
  ],
};

const repairTestPlan = {
  route: "repair-test",
  writeScope: ["src/**", "tests/**"],
  stages: [
    planStage("diagnose", "diagnose"),
    planStage("fix", "test_fix"),
    planStage("verify", "verify"),
  ],
};

const diagnosisOf = (verdict: string, first: string) => ({
  verdict,
  reproductionRef: ".qfai/report/reproduction.md",
  matchedIds: [first],
});

const pass = (step: string) => ({
  step,
  reason: `${step} has nothing to write for this change.`,
  evidenceRef: `.qfai/report/${step}-pass.md`,
});

const REVIEWS = [
  { role: "completion-reviewer", agentInstance: "reviewer-1", verdict: "PASS", reportRef: "r.md" },
];

interface Case {
  plan: NonNullable<Snapshot["plan"]>;
  accepted?: [string, string][];
  diagnosis?: ReturnType<typeof diagnosisOf>;
  facts?: Facts;
}

// Issues the next stage of the plan, then accepts a result for it carrying `fields`.
function acceptNext({ plan, accepted = [], diagnosis, facts = {} }: Case, fields: object) {
  const ready: Snapshot = {
    run: { id: "run-passes", state: "ready", sequence: 7 },
    plan,
    flowBinding: { flowId: FLOW },
    acceptedStages: accepted.map(([stageInstanceId, stageKind]) => ({
      stageInstanceId,
      stageKind,
      outcome: "accepted",
    })),
    ...(diagnosis ? { diagnosis } : {}),
  };
  const issued = decide(ready, { operation: "next" }, facts);
  const { workOrder, run } = issued.verdict;
  if (!workOrder || !run) throw new Error("next issues the stage's work order");
  const decision = decide(
    { ...ready, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: `${workOrder.stageInstanceId}-1`,
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        actor: { agentInstance: "author-1" },
        ...fields,
      },
    },
    facts,
  );
  return { workOrder, run, decision };
}

function outcome(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events.length,
  };
}

function refused(state: string, reason: string, subject: string) {
  return { state, reasons: [{ reason, subject }], events: 0 };
}

// QFAI:EX-0001-0216-01
it("A story-authoring result passing three pass-through steps, each with its reason and record", () => {
  const passes = [pass("sdd-flow"), pass("common-design-md"), pass("sdd-cycle")];
  const { workOrder, decision } = acceptNext(
    { plan: addFeaturePlan() },
    { passes, reviewResults: REVIEWS },
  );
  const recorded = decision.events.find((event) => event.type === "accept-nonfinal-result");

  expect({
    steps: workOrder.steps?.map((step) => [step.name, step.passThrough]),
    state: decision.verdict.run?.state,
    passes: recorded?.passes,
    notRun: recorded?.notRun,
  }).toEqual({
    steps: SDD_STEPS.map((step) => [step.name, step.passThrough === true]),
    state: "ready",
    passes,
    notRun: undefined,
  });
});

// QFAI:EX-0001-0216-02
it("A pass for implement-tdd, and a pass for implement-diagnose", () => {
  const diagnosis = diagnosisOf("missing-test", "EX-0001-0001-01");
  const implementing: Case = {
    plan: fixDefectPlan,
    accepted: [
      ["diagnose", "diagnose"],
      ["spec", "sdd_append"],
      ["acceptance", "acceptance"],
    ],
    diagnosis,
  };
  const implement = acceptNext(implementing, { passes: [pass("implement-tdd")] });
  const diagnose = acceptNext(
    { plan: fixDefectPlan },
    { diagnosis, passes: [pass("implement-diagnose")] },
  );

  expect([
    implement.workOrder.steps,
    outcome(implement.decision),
    outcome(diagnose.decision),
  ]).toEqual([
    kindSteps("implement"),
    refused("running", "pass-not-allowed", "implement-tdd"),
    refused("running", "pass-not-allowed", "implement-diagnose"),
  ]);
});

// QFAI:EX-0001-0216-04
it("An append result passing sdd-story for a criterion no example states, and a story-authoring result passing it while changing an example", () => {
  const append = acceptNext(
    {
      plan: fixDefectPlan,
      accepted: [["diagnose", "diagnose"]],
      diagnosis: diagnosisOf("missing-test", "AC-0001-0005-02"),
    },
    { passes: [pass("sdd-story")] },
  );
  const storySteps = SDD_STEPS.map((step) =>
    step.name === "sdd-story" ? passThrough(step.name) : step,
  );
  const authoring = acceptNext(
    { plan: addFeaturePlan(storySteps) },
    { passes: [pass("sdd-story")], changedFiles: [{ path: EXAMPLES, digest: "e".repeat(64) }] },
  );

  expect([outcome(append.decision), outcome(authoring.decision)]).toEqual([
    refused("running", "pass-obligation-open", "sdd-story"),
    refused("running", "pass-obligation-open", "sdd-story"),
  ]);
});

// QFAI:EX-0001-0216-05
it("A test fix passing the step that owns the diagnosed layer, then one passing the other layer's step", () => {
  const repairing: Case = {
    plan: repairTestPlan,
    accepted: [["diagnose", "diagnose"]],
    diagnosis: diagnosisOf("defective-test", "AC-0001-0001-01"),
  };
  const cited = { ids: ["AC-0001-0001-01"], digest: "c".repeat(64) };
  const testFix = { citedBefore: cited, citedAfter: cited, reviewRef: "r.md", rerunRef: "g.md" };
  const ownLayer = acceptNext(repairing, { testFix, passes: [pass("atdd-test-fix")] });
  const otherLayer = acceptNext(repairing, { testFix, passes: [pass("implement-test-fix")] });

  expect([outcome(ownLayer.decision), outcome(otherLayer.decision).state]).toEqual([
    refused("running", "pass-obligation-open", "atdd-test-fix"),
    "ready",
  ]);
});
