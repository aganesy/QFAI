import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { parseQuestionInput } from "../../../src/core/workflow/parse.js";

const boundedStages = [
  ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
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
  specs: { "spec-0007": { lifecycle: "active" } },
};

const statusChoice = {
  kind: "fact",
  text: "Which HTTP status should a request for a missing export return?",
  options: [
    { optionId: "404", label: "404", description: "The export is not found", effect: "proceed" },
    { optionId: "410", label: "410", description: "The export is gone", effect: "proceed" },
  ],
  selection: { min: 1, max: 1 },
};

function routeWith(question: unknown) {
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
          affectedSpecIds: ["spec-0007"],
          unresolvedQuestions: [question],
          newCapabilities: [],
          proposedWriteScope: ["src/exports/**"],
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    facts,
  );
}

function answer(
  routed: ReturnType<typeof routeWith>,
  given: { optionIds?: string[]; value?: string },
) {
  const run = routed.verdict.run;
  const questions = routed.verdict.questions ?? [];
  const question = questions[0];
  if (!run || !question) throw new Error("routing opens the fact question");
  return decide(
    { run, openQuestions: questions, scopeDigest: "a".repeat(64), digestKey: "b".repeat(64) },
    {
      operation: "decision",
      questionId: question.questionId,
      answer: given,
      answeredBy: "operator-1",
      expectedSequence: run.sequence,
    },
    { now: "2026-09-25T00:00:00.000Z" },
  );
}

it("A fact whose candidates can be listed is read as a choice, and never with a recommendation or one effect", () => {
  expect({
    choice: parseQuestionInput(statusChoice),
    recommended: parseQuestionInput({ ...statusChoice, recommendation: "404" }),
    withEffect: parseQuestionInput({ ...statusChoice, effect: "proceed" }),
    noSelection: parseQuestionInput({ ...statusChoice, selection: undefined }),
  }).toEqual({
    choice: statusChoice,
    recommended: undefined,
    withEffect: undefined,
    noSelection: undefined,
  });
});

it("A routing result asking for a fact among listed candidates opens a choice, answered by option", () => {
  const routed = routeWith(statusChoice);
  const chosen = answer(routed, { optionIds: ["410"] });
  const byValue = answer(routed, { value: "410" });
  const authorizations = chosen.events.flatMap((event) => event.authorization ?? []);

  expect({
    state: routed.verdict.run?.state,
    questions: (routed.verdict.questions ?? []).map(({ kind, options, recommendation }) => ({
      kind,
      optionIds: options.map((option) => option.optionId),
      recommendation,
    })),
    answeredState: chosen.verdict.run?.state,
    authorizations: authorizations.map(({ answer: given, effect }) => ({ answer: given, effect })),
    byValue: byValue.verdict.error,
  }).toEqual({
    state: "awaiting_input",
    questions: [{ kind: "fact", optionIds: ["404", "410"], recommendation: undefined }],
    answeredState: "ready",
    authorizations: [{ answer: { optionIds: ["410"] }, effect: "proceed" }],
    byValue: expect.objectContaining({
      code: "invalid-input",
      reasons: [{ reason: "option", subject: "answer" }],
    }),
  });
});
