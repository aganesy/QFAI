// QFAI:SPEC-0018:TC-0018-0043
// QFAI:SPEC-0018:TC-0018-0044

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { RUN_ID, finish, finishPlan, metFacts, readySnapshot } from "./finishFixture.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const plan = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-edit",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "non-normative-edit",
    },
    {
      stageInstanceId: "direct-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const specBinding = { specId: "spec-0007" };

function acceptWithDebts(debts: NonNullable<AcceptResult["debts"]>) {
  const issued = decide(
    { run: { id: "run-debt", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return null;
  const decision = decide(
    { run, plan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-direct-edit",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted_with_debt",
        debts,
      },
    },
    {},
  );
  const error = decision.verdict.error;
  return {
    ok: decision.verdict.ok,
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

it("TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner", () => {
  const actual = acceptWithDebts([
    {
      findingCode: "QFAI-TRACE-002",
      path: "src/notify/email.ts",
      cause: "The function has no spec annotation.",
      owningSpec: "spec-0007",
      detectingCommand: "qfai validate",
      blockingExtent: "completion",
    },
  ]);
  expect(actual).toEqual({
    ok: false,
    run: { id: "run-debt", state: "running", sequence: 6 },
    code: "invalid-input",
    reasons: [{ reason: "debt-owner-missing", subject: "debts[0]" }],
    events: [],
  });
});

const crossSpecDebt = {
  findingCode: "QFAI-TRACE-003",
  path: ".qfai/specs/spec-0003/06_Test-Cases.md",
  cause: "The test case cites an example this change retired.",
  owningSpec: "spec-0003",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "completion",
};

function acceptImplementWithDebt() {
  const accepted = [
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  ];
  const base = { plan: finishPlan, specBinding: { specId: "spec-0007" }, acceptedStages: accepted };
  const issued = decide(
    { ...base, run: { id: RUN_ID, state: "ready", sequence: 8 } },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("next issues the implement work order");
  return decide(
    { ...base, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-implement",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted_with_debt",
        debts: [crossSpecDebt],
      },
    },
    {},
  );
}

function finishWhileReported(debts: AcceptResult["debts"], reported: boolean) {
  const snapshot = readySnapshot();
  const acceptedStages = (snapshot.acceptedStages ?? []).map((stage) =>
    stage.stageKind === "implement"
      ? { ...stage, outcome: "accepted_with_debt", debts: debts ?? [] }
      : stage,
  );
  const facts = metFacts();
  const completion = facts.completion;
  if (!completion) throw new Error("the fixture carries completion facts");
  const finding = { code: crossSpecDebt.findingCode, file: crossSpecDebt.path, refs: [] };
  completion.validate.findings = reported ? [{ ...finding, severity: "warning" }] : [];
  return finish({ ...snapshot, acceptedStages }, facts);
}

it("TC-0018-0043 (TDD-0055): Decide accept of an accepted_with_debt result whose debt names another spec as owningSpec and qfai-sdd as resolvingOwner, then finish while the finding still stands", () => {
  const accepted = acceptImplementWithDebt();
  expect(accepted.verdict.run?.state).toBe("ready");
  const debts = accepted.events[0]?.debts;
  expect(debts).toEqual([crossSpecDebt]);

  const standing = finishWhileReported(debts, true);
  expect(standing.verdict.run?.state).toBe("ready");
  expect(standing.verdict.unmet).toEqual([
    { condition: "debt-open", subject: "spec-0003", owner: "qfai-sdd" },
  ]);

  const repaired = finishWhileReported(debts, false);
  expect(repaired.verdict.run?.state).toBe("completed");
  expect(repaired.verdict.unmet).toEqual([]);
});
