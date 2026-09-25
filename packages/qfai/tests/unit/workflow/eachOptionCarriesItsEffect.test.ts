// QFAI:SPEC-0018:TC-0018-0088
// QFAI:SPEC-0018:TC-0018-0089
// QFAI:SPEC-0018:TC-0018-0090

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
    optionIds: decision.events[0]?.authorization?.answer.optionIds,
    reasons: error && "reasons" in error ? error.reasons : [],
  };
}

const effects: [string, string, string, string[]][] = [
  ["TC-0018-0088 (TDD-0120): proceed", "keep", "ready", ["authorization-recorded"]],
  [
    "TC-0018-0088 (TDD-0121): replan",
    "narrow",
    "routing",
    ["authorization-recorded", "answer-changes-scope"],
  ],
  [
    "TC-0018-0088 (TDD-0122): stop",
    "stop",
    "cancelled",
    ["authorization-recorded", "authorized-stop"],
  ],
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

it("TC-0018-0089 (TDD-0123): A multi-select answer choosing a proceed option and a stop option", () => {
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
  ["TC-0018-0090 (TDD-0124): count-min", ["keep"], "recorded"],
  ["TC-0018-0090 (TDD-0125): count-max", ["keep", "narrow"], "recorded"],
  ["TC-0018-0090 (TDD-0126): below-min", [], "refused"],
  ["TC-0018-0090 (TDD-0127): above-max", ["keep", "narrow", "stop"], "refused"],
  ["TC-0018-0090 (TDD-0128): option-outside", ["archive"], "refused"],
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
