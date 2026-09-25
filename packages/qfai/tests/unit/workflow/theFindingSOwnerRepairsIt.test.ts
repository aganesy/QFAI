// QFAI:EX-0001-0194-05

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { writeTracked } from "../../../src/core/workflow/fold.js";

const plan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  })),
};
const flowBinding = { flowId: "BF-0007" };
const acceptedStages = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
  { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
];
const specFinding = {
  findingCode: "QFAI-TRACE-002",
  path: ".qfai/specs/BF-0007/06_Test-Cases.md",
  cause: "A test case names an example the spec does not define",
  owningFlow: "BF-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-sdd",
  blockingExtent: "run",
};

it("A verify result needs_repair whose finding sits in a spec file with resolvingOwner qfai-sdd", () => {
  const run = { id: "run-repair", state: "running", sequence: 12 };
  const verifyOrder = {
    workOrderId: "work-order-bounded-verify-1",
    stageInstanceId: "bounded-verify",
    attempt: 1,
    stageKind: "verify",
    target: { kind: "flow" as const, flowId: "BF-0007" },
    executor: { skill: "qfai-verify" },
    operation: "verify-full",
  };
  const accepted = decide(
    { run, plan, flowBinding, acceptedStages, outstandingWorkOrder: verifyOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-verify-repair",
        workOrderId: verifyOrder.workOrderId,
        stageInstanceId: verifyOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "needs_repair",
        debts: [specFinding],
      },
    },
    {},
  );
  const acceptEvent = accepted.events.find((event) => event.type === "accept-nonfinal-result");
  const repairRequest =
    acceptEvent?.stageInstanceId && acceptEvent.repairs
      ? { stageInstanceId: acceptEvent.stageInstanceId, debts: acceptEvent.repairs }
      : undefined;
  const next = accepted.verdict.run
    ? decide(
        {
          run: accepted.verdict.run,
          plan,
          flowBinding,
          acceptedStages,
          attempts: { "bounded-sdd-delta": 1, "bounded-implement": 1, "bounded-verify": 1 },
          ...(repairRequest ? { repairRequest } : {}),
        },
        { operation: "next" },
        {},
      )
    : accepted;

  expect({
    state: accepted.verdict.run?.state,
    executor: next.verdict.workOrder?.executor?.skill,
    stageKind: next.verdict.workOrder?.stageKind,
  }).toEqual({ state: "ready", executor: "qfai-sdd", stageKind: "sdd_delta" });
});

// A direct plan binds no flow; its only stage is the maintenance edit.
const direct = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-maintain",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "maintain",
      when: "always",
    },
  ],
};
const maintainOrder = {
  workOrderId: "work-order-direct-maintain-1",
  stageInstanceId: "direct-maintain",
  attempt: 1,
  stageKind: "maintenance",
  executor: { skill: "qfai-maintain" },
  operation: "maintain",
};
// The finding a maintenance edit returns when the change turns out to have a semantic effect.
const semanticEffect = {
  findingCode: "maintain-semantic-effect",
  path: "src/orders.ts",
  cause: "The corrected string is compared by the code",
  owningFlow: null,
  detectingCommand: "the maintenance edit's review",
  resolvingOwner: "qfai-implement",
  blockingExtent: "run",
};

function acceptMaintain(outcome: string, debts: (typeof semanticEffect)[]) {
  const run = { id: "run-reclassify", state: "running", sequence: 6 };
  const decision = decide(
    { run, plan: direct, outstandingWorkOrder: maintainOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-maintain-reclassify",
        workOrderId: maintainOrder.workOrderId,
        stageInstanceId: maintainOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome,
        debts,
      },
    },
    {},
  );
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => event.type),
    reasons: error && "reasons" in error ? error.reasons : undefined,
  };
}

it("A maintain result needs_repair whose finding names an owner the direct plan does not serve", () => {
  expect(acceptMaintain("needs_repair", [semanticEffect])).toEqual({
    state: "routing",
    events: ["scope-or-obligation-revision"],
    reasons: undefined,
  });
});

it("A blocked result of a run that binds no flow names no owning flow", () => {
  const onlyTheOperator = { ...semanticEffect, resolvingOwner: "operator" };

  expect(acceptMaintain("blocked", [onlyTheOperator]).state).toBe("blocked");
});

it("A blocked result of a bound run whose finding names no owning flow", () => {
  const run = { id: "run-repair", state: "running", sequence: 12 };
  const verifyOrder = {
    workOrderId: "work-order-bounded-verify-1",
    stageInstanceId: "bounded-verify",
    attempt: 1,
    stageKind: "verify",
    target: { kind: "flow" as const, flowId: "BF-0007" },
    executor: { skill: "qfai-verify" },
    operation: "verify-full",
  };
  const decision = decide(
    { run, plan, flowBinding, acceptedStages, outstandingWorkOrder: verifyOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-verify-flowless",
        workOrderId: verifyOrder.workOrderId,
        stageInstanceId: verifyOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "blocked",
        debts: [{ ...specFinding, owningFlow: null, resolvingOwner: "operator" }],
      },
    },
    { flows: ["BF-0007"] },
  );
  const error = decision.verdict.error;

  expect(error && "reasons" in error ? error.reasons : undefined).toEqual([
    { reason: "blocked-repairable", subject: "debts[0]" },
  ]);
});

it("The tracked summary of a run that binds no flow keeps a debt's null owning flow", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-flowless-summary-"));
  try {
    const debt = { ...semanticEffect, resolvingOwner: "operator" };
    const accepted = {
      sequence: 7,
      prevHash: null,
      event: "accept-nonfinal-result",
      operation: "accept",
      recordedAt: "2026-09-26T00:00:00.000Z",
      stageInstanceId: "direct-maintain",
      outcome: "accepted_with_debt",
      debts: [debt],
    };
    const snapshot = {
      run: { id: "run-flowless", state: "ready", sequence: 7 },
      plan: direct,
      acceptedStages: [
        {
          stageInstanceId: "direct-maintain",
          stageKind: "maintenance",
          outcome: "accepted_with_debt",
          debts: [debt],
        },
      ],
    };

    await writeTracked(dir, [accepted], snapshot);
    const summary: unknown = JSON.parse(await readFile(path.join(dir, "summary.json"), "utf8"));

    expect(summary).toMatchObject({ debts: [{ owningFlow: null }] });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
