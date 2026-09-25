// QFAI:SPEC-0018:TC-0018-0246
// QFAI:SPEC-0018:TC-0018-0247
// QFAI:SPEC-0018:TC-0018-0248
// QFAI:SPEC-0018:TC-0018-0249
// QFAI:SPEC-0018:TC-0018-0250

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];

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
function issueMiddle(stageKind: string, skill: string, operation: string) {
  const ready: NonNullable<Snapshot> = {
    run: { id: "run-records", state: "ready", sequence: 8 },
    plan: boundedPlan(stageKind, skill, operation),
    specBinding,
    acceptedStages: [
      { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
    ],
  };
  const issued = decide(ready, { operation: "next" }, {});
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
