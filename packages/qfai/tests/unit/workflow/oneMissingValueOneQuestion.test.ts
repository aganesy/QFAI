// QFAI:EX-0001-0195-07

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const boundedStages = [
  ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"],
  ["bounded-implement", "implement", "qfai-implement", "implement"],
  ["bounded-verify", "verify", "qfai-verify", "verify-full"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when: "always",
}));
const facts = {
  plans: { "bounded-change": { route: "bounded-change", stages: boundedStages } },
  flows: ["BF-0007"],
};

const statusQuestion = {
  kind: "fact",
  text: "Which HTTP status should a request for a missing export return?",
  effect: "proceed",
};

function routeWithOneMissingValue() {
  return decide(
    {
      run: { id: "run-status", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "route",
      },
    },
    {
      operation: "accept",
      result: {
        resultId: "routing-result-1",
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        expectedSequence: 2,
        outcome: "accepted",
        proposal: {
          requestKind: "change",
          candidateRoute: "bounded-change",
          goal: "Return the agreed status for a missing export.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedFlowIds: ["BF-0007"],
          unresolvedQuestions: [statusQuestion],
          newStories: [],
          proposedWriteScope: ["src/exports/**"],
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    facts,
  );
}

it("A routing result blocked only by the expected HTTP status, opened as one question", () => {
  const routed = routeWithOneMissingValue();
  const questions = routed.verdict.questions ?? [];
  const run = routed.verdict.run;
  const question = questions[0];
  const answered =
    run && question
      ? decide(
          {
            run,
            openQuestions: questions,
            scopeDigest: "a".repeat(64),
            digestKey: "b".repeat(64),
          },
          {
            operation: "decision",
            questionId: question.questionId,
            answer: { value: " 404 " },
            answeredBy: "operator-1",
            expectedSequence: run.sequence,
          },
          { now: "2026-09-25T00:00:00.000Z" },
        )
      : undefined;
  const authorizations = (answered?.events ?? []).flatMap((event) => event.authorization ?? []);

  expect({
    state: run?.state,
    questions: questions.map(({ kind, text, recommendation }) => ({
      kind,
      text,
      recommendation,
    })),
    stageKinds: (routed.verdict.plan?.stages ?? []).map((stage) => stage.stageKind),
    answeredState: answered?.verdict.run?.state,
    authorizations: authorizations.map(({ answer, effect }) => ({ answer, effect })),
  }).toEqual({
    state: "awaiting_input",
    questions: [{ kind: "fact", text: statusQuestion.text, recommendation: undefined }],
    stageKinds: ["sdd_delta", "implement", "verify"],
    answeredState: "ready",
    authorizations: [
      { answer: { valueDigest: expect.stringMatching(/^[a-f0-9]{64}$/) }, effect: "proceed" },
    ],
  });
});
