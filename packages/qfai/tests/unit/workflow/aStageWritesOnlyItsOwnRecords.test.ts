// QFAI:SPEC-0018:TC-0018-0246
// QFAI:SPEC-0018:TC-0018-0247
// QFAI:SPEC-0018:TC-0018-0248
// QFAI:SPEC-0018:TC-0018-0249
// QFAI:SPEC-0018:TC-0018-0250
// QFAI:SPEC-0018:TC-0018-0251

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { uiBearingSpecIdsOf } from "../../../src/core/workflow/observe.js";
import { removeTempTree } from "../../helpers/tempTree.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];

const specBinding = { specId: "spec-0001" };
const LEDGER = ".qfai/specs/spec-0001/tdd/test-list.md";
const IMPLEMENT_EVIDENCE = ".qfai/evidence/implement-spec-0001.md";

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
      stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"),
      stage("bounded-middle", stageKind, skill, operation),
      stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
    ],
  };
}

// Issues the middle stage's work order, bound to spec-0001.
function issueMiddle(stageKind: string, skill: string, operation: string, facts: Facts = {}) {
  const ready: NonNullable<Snapshot> = {
    run: { id: "run-records", state: "ready", sequence: 8 },
    plan: boundedPlan(stageKind, skill, operation),
    specBinding,
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
    {},
  );
  const error = decision.verdict.error;
  return {
    recordAreas: workOrder.recordAreas,
    ok: decision.verdict.ok,
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

const implement: [string, string, string] = ["implement", "qfai-implement", "implement"];
const sddAppend: [string, string, string] = ["sdd_append", "qfai-sdd", "defect-row-seeding"];

function refusedWriteScope(path: string) {
  return { ok: false, reasons: [{ reason: "write-scope", subject: path }] };
}

it("TC-0018-0246 (TDD-0479): own ledger and evidence accepted", () => {
  expect(acceptChanging(...implement, [LEDGER, IMPLEMENT_EVIDENCE])).toEqual({
    recordAreas: [LEDGER, IMPLEMENT_EVIDENCE],
    ok: true,
    reasons: undefined,
  });
});

it("TC-0018-0247 (TDD-0480): another spec's evidence refused write-scope", () => {
  const path = ".qfai/evidence/implement-spec-0002.md";
  const { ok, reasons } = acceptChanging(...implement, [path]);

  expect({ ok, reasons }).toEqual(refusedWriteScope(path));
});

it("TC-0018-0248 (TDD-0481): a change-request record refused write-scope", () => {
  const path = ".qfai/evidence/change-request-20260924-0001.md";
  const { ok, reasons } = acceptChanging(...implement, [path]);

  expect({ ok, reasons }).toEqual(refusedWriteScope(path));
});

const outsideRecords: [string, [string, string, string], string][] = [
  ["TC-0018-0249 (TDD-0482): decision-record", implement, ".qfai/evidence/decision-0001.md"],
  [
    "TC-0018-0249 (TDD-0483): workflow-evidence",
    implement,
    ".qfai/evidence/workflow/run-records/summary.json",
  ],
  [
    "TC-0018-0249 (TDD-0484): acceptance-criteria",
    sddAppend,
    ".qfai/specs/spec-0001/03_Acceptance-Criteria.md",
  ],
];

for (const [title, stage, path] of outsideRecords) {
  it(title, () => {
    const { ok, reasons } = acceptChanging(...stage, [path]);

    expect({ ok, reasons }).toEqual(refusedWriteScope(path));
  });
}

const SPEC = ".qfai/specs/spec-0001";
const implementRecords = [LEDGER, IMPLEMENT_EVIDENCE];
const atddRecords = [
  LEDGER,
  ".qfai/evidence/atdd-spec-0001.md",
  ".qfai/evidence/coverage-depth-spec-0001.md",
];

const derivations: [string, [string, string, string], string[] | undefined][] = [
  ["TC-0018-0250 (TDD-0485): implement", implement, implementRecords],
  [
    "TC-0018-0250 (TDD-0486): regression-fix",
    ["regression_fix", "qfai-implement", "regression-fix"],
    implementRecords,
  ],
  [
    "TC-0018-0250 (TDD-0487): test-fix-implement",
    ["test_fix", "qfai-implement", "test-fix"],
    implementRecords,
  ],
  [
    "TC-0018-0250 (TDD-0488): acceptance",
    ["acceptance", "qfai-atdd", "author-acceptance-tests"],
    atddRecords,
  ],
  ["TC-0018-0250 (TDD-0489): test-fix-atdd", ["test_fix", "qfai-atdd", "test-fix"], atddRecords],
  [
    "TC-0018-0250 (TDD-0490): sdd-append",
    sddAppend,
    [LEDGER, `${SPEC}/06_Test-Cases.md`, `${SPEC}/09_delta.md`, ".qfai/evidence/sdd-spec-0001.md"],
  ],
  [
    "TC-0018-0250 (TDD-0491): prototype-not-ui-bearing",
    ["prototype", "qfai-prototyping", "existing-runtime-contract"],
    undefined,
  ],
  ["TC-0018-0250 (TDD-0492): sdd", ["sdd", "qfai-sdd", "new-capability"], undefined],
  [
    "TC-0018-0250 (TDD-0493): sdd-delta",
    ["sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
    undefined,
  ],
  [
    "TC-0018-0250 (TDD-0494): discussion",
    ["discussion", "qfai-discussion", "resolve-unsettled-product-scope"],
    undefined,
  ],
  ["TC-0018-0250 (TDD-0495): verify", ["verify", "qfai-verify", "verify-full"], undefined],
  ["TC-0018-0250 (TDD-0496): diagnose", ["diagnose", "qfai-implement", "diagnose-only"], undefined],
  [
    "TC-0018-0250 (TDD-0497): maintenance",
    ["maintenance", "qfai-maintain", "non-normative-edit"],
    undefined,
  ],
  ["TC-0018-0250 (TDD-0498): route", ["route", "qfai-run", "route"], undefined],
];

for (const [title, stage, recordAreas] of derivations) {
  it(title, () => {
    expect(issueMiddle(...stage).workOrder.recordAreas).toEqual(recordAreas);
  });
}

const prototype: [string, string, string] = [
  "prototype",
  "qfai-prototyping",
  "existing-runtime-contract",
];

it("a prototype on a UI-bearing target names its session record", () => {
  expect([
    issueMiddle(...prototype, { uiBearingSpecIds: ["spec-0001"] }).workOrder.recordAreas,
    issueMiddle(...prototype, { uiBearingSpecIds: ["spec-0002"] }).workOrder.recordAreas,
  ]).toEqual([[".qfai/evidence/prototyping/grilling.md"], undefined]);
});

it("the UI-bearing specs are read from each spec's declaration", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ui-bearing-"));
  try {
    const specs = path.join(root, ".qfai", "specs");
    const declarations: [string, string][] = [
      ["spec-0001", "---\nsurface_type: ui-bearing\n---\n# Export screen\n"],
      ["spec-0002", "# Export job\n"],
    ];
    for (const [specId, text] of declarations) {
      await mkdir(path.join(specs, specId), { recursive: true });
      await writeFile(path.join(specs, specId, "01_Spec.md"), text);
    }

    expect(await uiBearingSpecIdsOf(root)).toEqual(["spec-0001"]);
  } finally {
    await removeTempTree(root);
  }
});

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
          affectedSpecIds: ["spec-0001"],
          newCapabilities: [],
          proposedWriteScope: plan.writeScope,
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    {
      plans: { "bounded-change": { route: "bounded-change", stages: plan.stages } },
      specs: { "spec-0001": { lifecycle: "active" } },
    },
  );
  return routed.verdict.plan;
}

it("TC-0018-0251 (TDD-0499): scope digest leaves recordAreas out", () => {
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
