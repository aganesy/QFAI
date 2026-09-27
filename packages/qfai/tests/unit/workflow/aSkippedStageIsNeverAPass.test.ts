// QFAI:SPEC-0018:TC-0018-0021

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;
type Facts = Parameters<typeof decide>[2];

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

function acceptSkipped(notRun: AcceptResult["notRun"], facts: Facts = {}) {
  const issued = decide(
    { run: { id: "run-skip", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return null;
  const result: AcceptResult = {
    resultId: "result-direct-edit",
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence: run.sequence,
    outcome: "accepted",
    ...(notRun ? { notRun } : {}),
  };
  const decision = decide(
    { run, plan, specBinding, outstandingWorkOrder: workOrder },
    { operation: "accept", result },
    facts,
  );
  const error = decision.verdict.error;
  return {
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

it("TC-0018-0021 (TDD-0032): Decide accept of a result with notRun", () => {
  const notRun: AcceptResult["notRun"] = {
    kind: "not_applicable",
    reason: "The change touches no screen.",
  };
  const actual = acceptSkipped(notRun);
  expect(actual).toEqual({
    ok: true,
    state: "ready",
    reasons: [],
    events: [
      expect.objectContaining({
        type: "accept-nonfinal-result",
        stageInstanceId: "direct-edit",
        notRun,
      }),
    ],
  });
  expect(actual?.events.some((event) => event.type === "receipt-recorded")).toBe(false);
});

function refusedInput(reason: string) {
  return {
    ok: false,
    state: "running",
    reasons: [{ reason, subject: "notRun" }],
    events: [],
  };
}

// QFAI:SPEC-0018:TC-0018-0022
it("TC-0018-0022 (TDD-0033): A result with notRun and no reason", () => {
  expect(acceptSkipped({ kind: "not_applicable" })).toEqual(refusedInput("skip-unexplained"));
});

// QFAI:SPEC-0018:TC-0018-0023
it("TC-0018-0023 (TDD-0034): A result with notRun", () => {
  const receiptRef = "receipts/verify-2026-09-24.json";
  expect(
    acceptSkipped({ kind: "reused", receiptRef }, { receiptValidity: { [receiptRef]: "stale" } }),
  ).toEqual(refusedInput("reuse-stale"));
});
