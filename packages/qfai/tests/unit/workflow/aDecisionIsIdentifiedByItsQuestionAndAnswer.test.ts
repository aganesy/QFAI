// QFAI:EX-0001-0195-10

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Input = Parameters<typeof decide>[1];
type Answer = NonNullable<Input["answer"]>;
type Question = NonNullable<Parameters<typeof decide>[0]["openQuestions"]>[number];

const choice: Question = {
  questionId: "question-4-1",
  kind: "decision",
  text: "Which formats should the export offer?",
  options: [
    {
      optionId: "csv",
      label: "CSV",
      description: "Rows as comma-separated text.",
      effect: "proceed",
    },
    { optionId: "json", label: "JSON", description: "Rows as a JSON array.", effect: "proceed" },
  ],
  selection: { min: 1, max: 2 },
  recommendation: "csv",
};

const fact: Question = {
  questionId: "question-4-1",
  kind: "fact",
  text: "What should the export file be called?",
  options: [],
  effect: "proceed",
};

const DIGEST_KEY = "b".repeat(64);

function answerTwice(question: Question, first: Answer, second: Answer) {
  const run = { id: "run-answer", state: "awaiting_input", sequence: 4 };
  const input = (answer: Answer, expectedSequence: number): Input => ({
    operation: "decision",
    questionId: question.questionId,
    answer,
    answeredBy: "operator-1",
    expectedSequence,
  });
  const facts = { now: "2026-09-25T00:00:00.000Z" };
  const recorded = decide(
    { run, openQuestions: [question], scopeDigest: "a".repeat(64), digestKey: DIGEST_KEY },
    input(first, 4),
    facts,
  );
  const authorization = recorded.events.flatMap((event) => event.authorization ?? [])[0];
  const after = recorded.verdict.run;
  if (!authorization || !after) return { recorded, repeated: null };
  const repeated = decide(
    {
      run: after,
      digestKey: DIGEST_KEY,
      answeredQuestions: {
        [question.questionId]: { answer: authorization.answer, verdict: recorded.verdict },
      },
    },
    input(second, 4),
    facts,
  );
  return { recorded, repeated };
}

function isReplay({ recorded, repeated }: ReturnType<typeof answerTwice>) {
  return {
    sameVerdict: repeated?.verdict === recorded.verdict,
    events: repeated?.events,
  };
}

it("The same question and the same answer submitted twice", () => {
  const twice = answerTwice(choice, { optionIds: ["csv"] }, { optionIds: ["csv"] });
  expect({
    ...isReplay(twice),
    humanDecisions: [...twice.recorded.events, ...(twice.repeated?.events ?? [])].filter(
      (event) => event.type === "authorization-recorded",
    ).length,
  }).toEqual({ sameVerdict: true, events: [], humanDecisions: 1 });
});

it("A different answer to the answered question", () => {
  const { repeated } = answerTwice(choice, { optionIds: ["csv"] }, { optionIds: ["json"] });
  expect({ code: repeated?.verdict.error?.code, events: repeated?.events }).toEqual({
    code: "answer-conflict",
    events: [],
  });
});

const sameAnswers: [string, Question, Answer, Answer][] = [
  ["nfd", fact, { value: "Café" }, { value: "Café" }],
  ["white-space", fact, { value: "exports" }, { value: "  exports\n" }],
  ["option-order", choice, { optionIds: ["csv", "json"] }, { optionIds: ["json", "csv"] }],
];

for (const [title, question, first, second] of sameAnswers) {
  it(title, () => {
    expect(isReplay(answerTwice(question, first, second))).toEqual({
      sameVerdict: true,
      events: [],
    });
  });
}
