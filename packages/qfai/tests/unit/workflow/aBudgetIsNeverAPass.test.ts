// QFAI:EX-0001-0189-20

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { completion, finishPlan } from "./finishFixture.js";
import { kindSteps, planStage, servedSteps } from "./kindSteps.js";

type Snapshot = Parameters<typeof decide>[0];

const flowBinding = { flowId: "BF-0007" };

const fixDefectPlan = {
  route: "fix-defect",
  stages: [
    planStage("bugfix-diagnose", "diagnose"),
    planStage("bugfix-implement", "implement"),
    planStage("bugfix-verify", "verify"),
  ],
};

// A run in `ready` after `replans` earlier replans, whose routing receipt no longer holds.
function stale(replans: number) {
  const ready: Snapshot = {
    run: { id: "run-budget", state: "ready", sequence: 10 + replans },
    plan: fixDefectPlan,
    flowBinding,
    replans,
    completionTarget: "qfai_done",
    routingReceiptRef: "results/route-1.json",
  };
  return ready;
}

function replan(snapshot: Snapshot) {
  return decide(
    snapshot,
    { operation: "next" },
    { receiptValidity: { "results/route-1.json": "stale" } },
  );
}

it("Four replans in one run", () => {
  const decisions = [0, 1, 2, 3].map((earlier) => replan(stale(earlier)));
  const fourth = decisions[3]?.verdict;
  const blockedRun = fourth?.run;
  if (!blockedRun) throw new Error("the fourth replan returns the run");
  const finished = decide(
    { ...stale(3), run: blockedRun },
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
  path: ".qfai/specs/BF-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningFlow: "BF-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

// A verify result asking for its fourth automatic repair of `finding` at `path`.
function fourthRepair(path: string) {
  const run = { id: "run-repair-budget", state: "running", sequence: 20 };
  const acceptedStages = [
    { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd", outcome: "accepted" },
    { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
  ];
  const verifyOrder = {
    workOrderId: "work-order-bounded-verify-4",
    stageInstanceId: "bounded-verify",
    attempt: 4,
    stageKind: "verify",
    target: { kind: "flow" as const, flowId: "BF-0007" },
    steps: kindSteps("verify"),
  };
  const snapshot = {
    run,
    plan: finishPlan,
    flowBinding,
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
    issued: next?.verdict.workOrder?.steps,
  };
}

it("same-path", () => {
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

it("other-path", () => {
  expect(fourthRepair(".qfai/specs/BF-0007/05_Examples.md")).toEqual({
    state: "ready",
    halt: undefined,
    issued: servedSteps("sdd", "qfai-sdd"),
  });
});
