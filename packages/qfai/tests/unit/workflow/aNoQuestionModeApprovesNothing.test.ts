// QFAI:EX-0001-0195-06

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finish, metFacts, readySnapshot } from "./finishFixture.js";

type Question = NonNullable<Parameters<typeof decide>[0]["openQuestions"]>[number];

const question: Question = {
  questionId: "question-9-1",
  kind: "decision",
  text: "The export also removes archived rows. Keep that?",
  options: [
    { optionId: "keep", label: "Keep it", description: "The run goes on.", effect: "proceed" },
    { optionId: "stop", label: "Stop", description: "The run ends here.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "stop",
};

it("A run in awaiting_input that nobody answers", () => {
  const ready = readySnapshot();
  const waiting = {
    ...ready,
    run: { ...ready.run, state: "awaiting_input" },
    openQuestions: [question],
  };

  const next = decide(waiting, { operation: "next" }, {});
  expect(next.verdict).toEqual({
    ok: true,
    run: waiting.run,
    workOrder: null,
    questions: [question],
  });
  expect(next.events).toEqual([]);

  const finished = finish(waiting, metFacts());
  expect(finished.verdict.unmet).toEqual([
    { condition: "run-waiting", subject: "question-9-1", owner: "operator" },
  ]);
  expect(finished.events).toEqual([]);
});
