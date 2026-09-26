// QFAI:EX-0001-0195-05

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Question = NonNullable<Parameters<typeof decide>[0]["openQuestions"]>[number];

const plan = {
  route: "bounded-change",
  writeScope: ["src/export/**"],
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
const question: Question = {
  questionId: "question-3-1",
  kind: "decision",
  text: "The export also removes archived rows. Keep that?",
  options: [
    { optionId: "keep", label: "Keep it", description: "The run goes on.", effect: "proceed" },
    { optionId: "stop", label: "Stop", description: "The run ends here.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "keep",
};
const flowBinding = { flowId: "BF-0007" };

it("A proceed answer to a material question, then next", () => {
  const answered = decide(
    {
      run: { id: "run-proceed", state: "awaiting_input", sequence: 5 },
      plan,
      flowBinding,
      openQuestions: [question],
      scopeDigest: "d".repeat(64),
    },
    {
      operation: "decision",
      questionId: "question-3-1",
      answer: { optionIds: ["keep"] },
      answeredBy: "operator",
      expectedSequence: 5,
    },
    { now: "2026-09-25T04:00:00.000Z" },
  );
  const run = answered.verdict.run;
  expect(run?.state).toBe("ready");
  if (!run) return;

  const issued = decide({ run, plan, flowBinding }, { operation: "next" }, {});

  expect(issued.verdict.run?.state).toBe("running");
  expect(issued.verdict.workOrder?.stageInstanceId).toBe("bounded-sdd-delta");
});
