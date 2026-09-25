// QFAI:SPEC-0018:TC-0018-0135
// QFAI:SPEC-0018:TC-0018-0136
// QFAI:SPEC-0018:TC-0018-0137
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
    specBinding: { specId: "spec-0007" },
    ...(state === "running" ? { outstandingWorkOrder: workOrder } : {}),
  };
}

const states: [string, string][] = [
  ["TC-0018-0135 (TDD-0149): created", "created"],
  ["TC-0018-0135 (TDD-0150): routing", "routing"],
  ["TC-0018-0135 (TDD-0151): ready", "ready"],
  ["TC-0018-0135 (TDD-0152): running", "running"],
  ["TC-0018-0135 (TDD-0153): awaiting-input", "awaiting_input"],
  ["TC-0018-0135 (TDD-0154): blocked", "blocked"],
  ["TC-0018-0135 (TDD-0155): interrupted", "interrupted"],
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

it("TC-0018-0136 (TDD-0156): A second stop on a run a stop cancelled", () => {
  const snapshot = cancelled();
  const again = decide(snapshot, stop, {});
  expect({ same: again.verdict === snapshot.stopVerdict, events: again.events }).toEqual({
    same: true,
    events: [],
  });
});

const afterStop: [string, Input][] = [
  [
    "TC-0018-0137 (TDD-0157): accept",
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
  ["TC-0018-0137 (TDD-0158): next", { operation: "next" }],
  [
    "TC-0018-0137 (TDD-0159): decision",
    {
      operation: "decision",
      questionId: "question-7-1",
      answer: { optionIds: ["keep"] },
      answeredBy: "operator-1",
      expectedSequence: 8,
    },
  ],
  ["TC-0018-0137 (TDD-0160): resume", { operation: "resume" }],
  ["TC-0018-0137 (TDD-0161): finish", { operation: "finish" }],
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
