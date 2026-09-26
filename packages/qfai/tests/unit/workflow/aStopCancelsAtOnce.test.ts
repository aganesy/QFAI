// QFAI:EX-0001-0196-14
// Fault seeds: FAULT-021

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { completion, finishPlan } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type Input = Parameters<typeof decide>[1];

const stop: Input = { operation: "decision", stop: true, answeredBy: "operator-1" };

const workOrder = {
  workOrderId: "work-order-bounded-implement-1",
  stageInstanceId: "bounded-implement",
  attempt: 1,
  stageKind: "implement",
};

function runIn(state: string): Snapshot {
  return {
    run: { id: "run-stop", state, sequence: 7 },
    plan: finishPlan,
    flowBinding: { flowId: "BF-0007" },
    ...(state === "running" ? { outstandingWorkOrder: workOrder } : {}),
  };
}

const states: [string, string][] = [
  ["created", "created"],
  ["routing", "routing"],
  ["ready", "ready"],
  ["running", "running"],
  ["awaiting-input", "awaiting_input"],
  ["blocked", "blocked"],
  ["interrupted", "interrupted"],
];

for (const [title, state] of states) {
  it(title, () => {
    const stopped = decide(runIn(state), stop, {});
    expect({
      run: stopped.verdict.run,
      events: stopped.events.map((event) => event.type),
    }).toEqual({
      run: { id: "run-stop", state: "cancelled", sequence: 8 },
      events: ["authorized-stop"],
    });
  });
}

function cancelled(): Snapshot {
  const first = decide(runIn("running"), stop, {});
  const run = first.verdict.run ?? { id: "run-stop", state: "running", sequence: 7 };
  return { ...runIn("running"), run, stopVerdict: first.verdict };
}

it("A second stop on a run a stop cancelled", () => {
  const snapshot = cancelled();
  const again = decide(snapshot, stop, {});
  expect({ same: again.verdict === snapshot.stopVerdict, events: again.events }).toEqual({
    same: true,
    events: [],
  });
});

const afterStop: [string, Input][] = [
  [
    "accept",
    {
      operation: "accept",
      result: {
        resultId: "result-implement",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: 8,
        outcome: "accepted",
      },
    },
  ],
  ["next", { operation: "next" }],
  [
    "decision",
    {
      operation: "decision",
      questionId: "question-7-1",
      answer: { optionIds: ["keep"] },
      answeredBy: "operator-1",
      expectedSequence: 8,
    },
  ],
  ["resume", { operation: "resume" }],
  ["finish", { operation: "finish" }],
];

for (const [title, input] of afterStop) {
  it(title, () => {
    const refused = decide(cancelled(), input, { completion: completion() });
    expect({
      ok: refused.verdict.ok,
      code: refused.verdict.error?.code,
      state: refused.verdict.run?.state,
      events: refused.events,
    }).toEqual({ ok: false, code: "run-terminal", state: "cancelled", events: [] });
  });
}
