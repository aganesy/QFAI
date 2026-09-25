// QFAI:SPEC-0018:TC-0018-0155
// QFAI:SPEC-0018:TC-0018-0156

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { completion, finishPlan } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];

const specBinding = { specId: "spec-0007" };

const bugfixPlan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only"],
    ["bugfix-implement", "implement", "qfai-implement", "implement"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  })),
};

// A run whose diagnose work order is outstanding, after `replans` earlier replans.
function diagnosing(replans: number) {
  const ready: Snapshot = {
    run: { id: "run-budget", state: "ready", sequence: 10 + replans },
    plan: bugfixPlan,
    specBinding,
    replans,
    completionTarget: "qfai_done",
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the bugfix run issues its diagnose work order");
  return { ...ready, run, outstandingWorkOrder: workOrder };
}

function replan(snapshot: ReturnType<typeof diagnosing>) {
  const workOrder = snapshot.outstandingWorkOrder;
  return decide(
    snapshot,
    {
      operation: "accept",
      result: {
        resultId: `result-replan-${snapshot.replans}`,
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: snapshot.run.sequence,
        outcome: "accepted",
        diagnosis: {
          verdict: "expectation-differs",
          reproductionRef: "evidence/reproduction.json",
          matchedRowIds: ["TDD-0004"],
        },
      },
    },
    {},
  );
}

it("TC-0018-0155 (TDD-0209): Four replans in one run", () => {
  const decisions = [0, 1, 2, 3].map((earlier) => replan(diagnosing(earlier)));
  const fourth = decisions[3]?.verdict;
  const blockedRun = fourth?.run;
  if (!blockedRun) throw new Error("the fourth replan returns the run");
  const { outstandingWorkOrder: _issued, ...diagnosed } = diagnosing(3);
  const finished = decide(
    { ...diagnosed, run: blockedRun },
    { operation: "finish" },
    { completion: completion() },
  );

  expect({
    states: decisions.map((decision) => decision.verdict.run?.state),
    halt: fourth.halt,
    unmet: (finished.verdict.unmet ?? []).map((entry) => entry.condition),
  }).toEqual({
    states: ["routing", "routing", "routing", "blocked"],
    halt: { blocker: "budget-exhausted", owner: "operator", subjects: ["replan"] },
    unmet: expect.arrayContaining(["run-waiting"]),
  });
});

const finding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/spec-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningSpec: "spec-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

// A verify result asking for its fourth automatic repair of `finding` at `path`.
function fourthRepair(path: string) {
  const run = { id: "run-repair-budget", state: "running", sequence: 20 };
  const acceptedStages = [
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
    { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
  ];
  const verifyOrder = {
    workOrderId: "work-order-bounded-verify-4",
    stageInstanceId: "bounded-verify",
    attempt: 4,
    stageKind: "verify",
    target: { kind: "spec" as const, specId: "spec-0007" },
    executor: { skill: "qfai-verify" },
    operation: "verify-full",
  };
  const snapshot = {
    run,
    plan: finishPlan,
    specBinding,
    acceptedStages,
    attempts: { "bounded-sdd-delta": 4, "bounded-implement": 1, "bounded-verify": 4 },
    repairsByCause: [{ findingCode: finding.findingCode, path: finding.path, count: 3 }],
  };
  const debt = { ...finding, path };
  const accepted = decide(
    { ...snapshot, outstandingWorkOrder: verifyOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-verify-repair-4",
        workOrderId: verifyOrder.workOrderId,
        stageInstanceId: verifyOrder.stageInstanceId,
        attempt: 4,
        expectedSequence: run.sequence,
        outcome: "needs_repair",
        debts: [debt],
      },
    },
    {},
  );
  const ready = accepted.verdict.run;
  const next =
    ready?.state === "ready"
      ? decide(
          {
            ...snapshot,
            run: ready,
            repairRequest: { stageInstanceId: "bounded-verify", debts: [debt] },
          },
          { operation: "next" },
          {},
        )
      : undefined;
  return {
    state: ready?.state,
    halt: accepted.verdict.halt,
    issued: next?.verdict.workOrder?.executor?.skill,
  };
}

it("TC-0018-0156 (TDD-0210): same-path", () => {
  expect(fourthRepair(finding.path)).toEqual({
    state: "blocked",
    halt: {
      blocker: "budget-exhausted",
      owner: "operator",
      subjects: [`${finding.findingCode}@${finding.path}`],
    },
    issued: undefined,
  });
});

it("TC-0018-0156 (TDD-0211): other-path", () => {
  expect(fourthRepair(".qfai/specs/spec-0007/05_Examples.md")).toEqual({
    state: "ready",
    halt: undefined,
    issued: "qfai-sdd",
  });
});
