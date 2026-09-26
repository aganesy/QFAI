// QFAI:EX-0001-0195-04

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Question = NonNullable<Parameters<typeof decide>[0]["openQuestions"]>[number];

const run = { id: "run-answer", state: "awaiting_input", sequence: 5 };
const options: Question["options"] = [
  {
    optionId: "keep",
    label: "Keep it",
    description: "The run goes on as planned.",
    effect: "proceed",
  },
  {
    optionId: "narrow",
    label: "Narrow it",
    description: "The run is planned again.",
    effect: "replan",
  },
  { optionId: "stop", label: "Stop", description: "The run ends here.", effect: "stop" },
];

function answer(optionIds: string[], selection = { min: 1, max: 1 }) {
  const question: Question = {
    questionId: "question-3-1",
    kind: "decision",
    text: "The export also removes archived rows. Keep that?",
    options,
    selection,
    recommendation: "narrow",
  };
  return decide(
    { run, openQuestions: [question], scopeDigest: "d".repeat(64) },
    {
      operation: "decision",
      questionId: "question-3-1",
      answer: { optionIds },
      answeredBy: "operator",
      expectedSequence: run.sequence,
    },
    { now: "2026-09-25T04:00:00.000Z" },
  );
}

function outcomeOf(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => event.type),
    effect: decision.events[0]?.authorization?.effect,
    optionIds: answerOptionIds(decision.events[0]?.authorization?.answer),
    reasons: error && "reasons" in error ? error.reasons : [],
  };
}

const effects: [string, string, string, string[]][] = [
  ["proceed", "keep", "ready", ["authorization-recorded", "valid-answer-no-replan"]],
  ["replan", "narrow", "routing", ["authorization-recorded", "answer-changes-scope"]],
  ["stop", "stop", "cancelled", ["authorization-recorded", "authorized-stop"]],
];

for (const [title, optionId, state, events] of effects) {
  it(title, () => {
    const effect = options.find((option) => option.optionId === optionId)?.effect;

    expect(outcomeOf(answer([optionId]))).toEqual({
      state,
      events,
      effect,
      optionIds: [optionId],
      reasons: [],
    });
  });
}

// QFAI:EX-0001-0195-15
it("A replan answer, then next", () => {
  const replanned = answer(["narrow"]).verdict.run;
  if (!replanned) throw new Error("the replan answer returns the run");
  const next = decide({ run: replanned }, { operation: "next" }, {});
  const workOrder = next.verdict.workOrder;

  expect({
    state: replanned.state,
    workOrder: [workOrder?.stageKind, workOrder?.executor?.skill, workOrder?.operation],
  }).toEqual({ state: "routing", workOrder: ["route", "qfai-run", "route"] });
});

it("A multi-select answer choosing a proceed option and a stop option", () => {
  expect(outcomeOf(answer(["keep", "stop"], { min: 1, max: 2 }))).toEqual({
    state: "cancelled",
    events: ["authorization-recorded", "authorized-stop"],
    effect: "stop",
    optionIds: ["keep", "stop"],
    reasons: [],
  });
});

const refused = {
  state: "awaiting_input",
  events: [],
  effect: undefined,
  optionIds: undefined,
  reasons: [{ reason: "option", subject: "answer" }],
};
const counts: [string, string[], "recorded" | "refused"][] = [
  ["count-min", ["keep"], "recorded"],
  ["count-max", ["keep", "narrow"], "recorded"],
  ["below-min", [], "refused"],
  ["above-max", ["keep", "narrow", "stop"], "refused"],
  ["option-outside", ["archive"], "refused"],
];

for (const [title, optionIds, expected] of counts) {
  it(title, () => {
    const actual = outcomeOf(answer(optionIds, { min: 1, max: 2 }));

    if (expected === "refused") {
      expect(actual).toEqual(refused);
    } else {
      expect({ recorded: actual.events[0], optionIds: actual.optionIds }).toEqual({
        recorded: "authorization-recorded",
        optionIds,
      });
    }
  });
}

function answerOptionIds(answer: { optionIds: string[] } | { valueDigest: string } | undefined) {
  return answer && "optionIds" in answer ? answer.optionIds : undefined;
}
