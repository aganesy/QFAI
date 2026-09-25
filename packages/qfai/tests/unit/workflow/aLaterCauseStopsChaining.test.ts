// QFAI:EX-0001-0199-07

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type Input = Parameters<typeof decide>[1];

const cause = { cause: "policy-drift" as const };
const flowBinding = { flowId: "BF-0007" };

const openQuestion = {
  questionId: "question-5-1",
  kind: "decision" as const,
  text: "Keep the retry policy?",
  options: [
    {
      optionId: "keep",
      label: "Keep it",
      description: "The plan runs as is.",
      effect: "proceed" as const,
    },
  ],
  selection: { min: 1, max: 1 },
};

const ready: Snapshot = {
  run: { id: "run-cause", state: "ready", sequence: 4 },
  plan: finishPlan,
  flowBinding,
};

const awaiting: Snapshot = {
  run: { id: "run-cause", state: "awaiting_input", sequence: 5 },
  plan: finishPlan,
  flowBinding,
  scopeDigest: "d".repeat(64),
  openQuestions: [openQuestion],
};

const answer: Input = {
  operation: "decision",
  questionId: openQuestion.questionId,
  answer: { optionIds: ["keep"] },
  answeredBy: "operator",
  expectedSequence: 5,
};

const stop: Input = { operation: "decision", stop: true, answeredBy: "operator" };

function outcome(snapshot: Snapshot, input: Input) {
  const decision = decide(snapshot, input, { ...cause, now: "2026-09-25T00:00:00.000Z" });
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    code: error?.code,
    cause: error && "cause" in error ? error.cause : undefined,
    events: decision.events.map((event) => event.type),
  };
}

const refused = (state: string) => ({
  state,
  code: "fail-closed",
  cause: "policy-drift",
  events: [],
});
const cancelled = {
  state: "cancelled",
  code: undefined,
  cause: undefined,
  events: ["authorized-stop"],
};

it("ready-refused", () => {
  expect(outcome(ready, { operation: "next" })).toEqual(refused("ready"));
});

it("awaiting-input-refused", () => {
  expect(outcome(awaiting, answer)).toEqual(refused("awaiting_input"));
});

it("ready-stop", () => {
  expect(outcome(ready, stop)).toEqual(cancelled);
});

it("awaiting-input-stop", () => {
  expect(outcome(awaiting, stop)).toEqual(cancelled);
});

it("Facts where the observed diff escapes the authorized write scope at a write operation", () => {
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its first work order");
  const escaped = "src/billing/charge.ts";
  const accepted = decide(
    { ...ready, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-escaped",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
      },
    },
    { observedChangedPaths: ["src/notify/email.ts", escaped] },
  );

  expect({ state: accepted.verdict.run?.state, halt: accepted.verdict.halt }).toEqual({
    state: "blocked",
    halt: { cause: "invariant-violation", owner: "operator", subjects: [escaped] },
  });
});
