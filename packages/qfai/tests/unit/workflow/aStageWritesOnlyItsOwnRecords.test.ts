// QFAI:EX-0001-0192-38
// QFAI:EX-0001-0192-49

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];

const flowBinding = { flowId: "BF-0001" };
const IMPLEMENT_EVIDENCE = ".qfai/evidence/implement-BF-0001.md";
const STORY = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0005";
const CONTRACT = ".qfai/spec/03_contract/cli/notify.md";
const DECISIONS = ".qfai/spec/decisions.md";
const OPEN_QUESTIONS = ".qfai/spec/open-questions.md";
// Defect example seeding after a diagnosis whose first matched ID is AC-0001-0005-02: the
// observer derives the story's examples file and the one contract citing that criterion.
const facts = {
  specsDir: ".qfai/spec",
  seeding: { exampleFile: `${STORY}/03_Example.md`, contractFiles: [CONTRACT] },
};

// A bounded-change plan whose middle stage is the kind under test.
function boundedPlan(stageKind: string, skill: string, operation: string) {
  const stage = (id: string, kind: string, by: string, op: string) => ({
    stageInstanceId: id,
    stageKind: kind,
    skill: by,
    operation: op,
    when: "always",
  });
  return {
    route: "bounded-change",
    writeScope: ["src/notify"],
    stages: [
      stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
      stage("bounded-middle", stageKind, skill, operation),
      stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
    ],
  };
}

// Issues the middle stage's work order, bound to BF-0001.
function issueMiddle(stageKind: string, skill: string, operation: string) {
  const ready: NonNullable<Snapshot> = {
    run: { id: "run-records", state: "ready", sequence: 8 },
    plan: boundedPlan(stageKind, skill, operation),
    flowBinding,
    acceptedStages: [
      { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
    ],
  };
  const issued = decide(ready, { operation: "next" }, facts);
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("next issues the middle stage's work order");
  return { snapshot: { ...ready, run, outstandingWorkOrder: workOrder }, workOrder, run };
}

// Accepts a result of the middle stage that changed exactly `paths`.
function acceptChanging(stageKind: string, skill: string, operation: string, paths: string[]) {
  const { snapshot, workOrder, run } = issueMiddle(stageKind, skill, operation);
  const decision = decide(
    snapshot,
    {
      operation: "accept",
      result: {
        resultId: "result-records",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        changedFiles: paths.map((path) => ({ path, digest: "d".repeat(64) })),
      },
    },
    facts,
  );
  const error = decision.verdict.error;
  return {
    recordAreas: workOrder.recordAreas,
    ok: decision.verdict.ok,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

const implement: [string, string, string] = ["implement", "qfai-implement", "implement"];
const sddAppend: [string, string, string] = ["sdd_append", "qfai-sdd", "defect-example-seeding"];

function refusedWriteScope(path: string) {
  return { ok: false, reasons: [{ reason: "write-scope", subject: path }] };
}

it("own evidence accepted", () => {
  expect(acceptChanging(...implement, [IMPLEMENT_EVIDENCE])).toEqual({
    recordAreas: [IMPLEMENT_EVIDENCE],
    ok: true,
    reasons: undefined,
  });
});

it("another flow's evidence refused write-scope", () => {
  const path = ".qfai/evidence/implement-BF-0002.md";
  const { ok, reasons } = acceptChanging(...implement, [path]);

  expect({ ok, reasons }).toEqual(refusedWriteScope(path));
});

it("the decisions table refused write-scope", () => {
  const path = DECISIONS;
  const { ok, reasons } = acceptChanging(...implement, [path]);

  expect({ ok, reasons }).toEqual(refusedWriteScope(path));
});

const outsideRecords: [string, [string, string, string], string][] = [
  ["decision-record", implement, ".qfai/evidence/decision/decision-0001.md"],
  ["workflow-evidence", implement, ".qfai/evidence/workflow/run-records/summary.json"],
  ["acceptance-criteria", sddAppend, `${STORY}/02_Acceptance-Criteria.md`],
  ["user-story", sddAppend, `${STORY}/01_User-story.md`],
];

for (const [title, stage, path] of outsideRecords) {
  it(title, () => {
    const { ok, reasons } = acceptChanging(...stage, [path]);

    expect({ ok, reasons }).toEqual(refusedWriteScope(path));
  });
}

const SDD_EVIDENCE = ".qfai/evidence/sdd-BF-0001.md";
const implementRecords = [IMPLEMENT_EVIDENCE];
const atddRecords = [".qfai/evidence/atdd-BF-0001.md", ".qfai/evidence/coverage-depth-BF-0001.md"];

const derivations: [string, [string, string, string], string[] | undefined][] = [
  ["implement", implement, implementRecords],
  ["regression-fix", ["regression_fix", "qfai-implement", "regression-fix"], implementRecords],
  ["test-fix-implement", ["test_fix", "qfai-implement", "test-fix"], implementRecords],
  ["acceptance", ["acceptance", "qfai-atdd", "author-acceptance-tests"], atddRecords],
  ["test-fix-atdd", ["test_fix", "qfai-atdd", "test-fix"], atddRecords],
  ["sdd-append", sddAppend, [`${STORY}/03_Example.md`, CONTRACT, DECISIONS, SDD_EVIDENCE]],
  [
    "prototype-not-ui-bearing",
    ["prototype", "qfai-prototyping", "existing-runtime-contract"],
    undefined,
  ],
  ["sdd", ["sdd", "qfai-sdd", "new-story"], [DECISIONS, OPEN_QUESTIONS, SDD_EVIDENCE]],
  [
    "sdd-delta",
    ["sdd_delta", "qfai-sdd", "update-or-applicability-check"],
    [DECISIONS, OPEN_QUESTIONS, SDD_EVIDENCE],
  ],
  ["discussion", ["discussion", "qfai-discussion", "resolve-unsettled-product-scope"], undefined],
  ["verify", ["verify", "qfai-verify", "verify-full"], undefined],
  ["diagnose", ["diagnose", "qfai-implement", "diagnose-only"], undefined],
  ["maintenance", ["maintenance", "qfai-maintain", "non-normative-edit"], undefined],
  ["route", ["route", "qfai-run", "route"], undefined],
];

for (const [title, stage, recordAreas] of derivations) {
  it(title, () => {
    expect(issueMiddle(...stage).workOrder.recordAreas).toEqual(recordAreas);
  });
}

// The checked plan a routing result becomes, for the same bounded-change stages.
function checkedPlanDocument() {
  const plan = boundedPlan(...implement);
  const routed = decide(
    {
      run: { id: "run-records", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "route",
      },
    },
    {
      operation: "accept",
      result: {
        resultId: "routing-result-1",
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        expectedSequence: 2,
        outcome: "accepted",
        proposal: {
          requestKind: "change",
          candidateRoute: "bounded-change",
          goal: "Notify the owner when an export fails.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedFlowIds: ["BF-0001"],
          newStories: [],
          proposedWriteScope: plan.writeScope,
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    {
      plans: { "bounded-change": { route: "bounded-change", stages: plan.stages } },
      flows: ["BF-0001"],
    },
  );
  return routed.verdict.plan;
}

it("scope digest leaves recordAreas out", () => {
  const implementOrder = issueMiddle(...implement).workOrder;
  const acceptanceOrder = issueMiddle(
    "acceptance",
    "qfai-atdd",
    "author-acceptance-tests",
  ).workOrder;
  const plan = checkedPlanDocument();

  expect({
    recordAreasDiffer:
      JSON.stringify(implementOrder.recordAreas) !== JSON.stringify(acceptanceOrder.recordAreas),
    digests: [implementOrder.scope?.digest, acceptanceOrder.scope?.digest],
    planHoldsRecordAreas: plan === undefined || "recordAreas" in plan,
  }).toEqual({
    recordAreasDiffer: true,
    digests: [expect.stringMatching(/^[a-f0-9]{64}$/), implementOrder.scope?.digest],
    planHoldsRecordAreas: false,
  });
});

it("seeding writes its example and citation, and no criterion", () => {
  const example = `${STORY}/03_Example.md`;
  expect(acceptChanging(...sddAppend, [example, CONTRACT, DECISIONS, SDD_EVIDENCE])).toEqual({
    recordAreas: [example, CONTRACT, DECISIONS, SDD_EVIDENCE],
    ok: true,
    reasons: undefined,
  });
});
