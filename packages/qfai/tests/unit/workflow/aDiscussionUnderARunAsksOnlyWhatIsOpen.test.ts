// QFAI:SPEC-0018:TC-0018-0241

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type Decision = ReturnType<typeof decide>;

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
const statusQuestion = {
  kind: "fact",
  text: "Which HTTP status should a request for a missing export return?",
  effect: "proceed",
};

function route(): Decision {
  return decide(
    {
      run: { id: "run-settled", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "routing",
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
          unresolvedQuestions: [statusQuestion],
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

// The run's settled facts as the journal leaves them: the last event that carries them.
function settledOf(decision: Decision) {
  const settled = [...decision.events].reverse().find((event) => event.settled)?.settled;
  if (!settled) throw new Error("the decision records what the run has settled");
  return settled;
}

it("TC-0018-0241 (TDD-0470): settled names the routing result and the answered question", () => {
  const routed = route();
  const run = routed.verdict.run;
  const question = routed.verdict.questions?.[0];
  const plan = routed.verdict.plan;
  if (!run || !question || !plan) throw new Error("routing opens one fact question");
  const waiting: NonNullable<Snapshot> = {
    run,
    plan,
    specBinding: { specId: "spec-0007" },
    openQuestions: [question],
    scopeDigest: "a".repeat(64),
    digestKey: "b".repeat(64),
    settled: settledOf(routed),
  };
  const answered = decide(
    waiting,
    {
      operation: "decision",
      questionId: question.questionId,
      answer: { value: " 404 " },
      answeredBy: "operator-1",
      expectedSequence: run.sequence,
    },
    { now: "2026-09-25T00:00:00.000Z" },
  );
  const ready = answered.verdict.run;
  if (!ready) throw new Error("the answer moves the run on");
  const { openQuestions: _answered, ...rest } = waiting;
  const issued = decide(
    { ...rest, run: ready, settled: settledOf(answered) },
    { operation: "next" },
    {},
  );

  expect(issued.verdict.workOrder?.settled).toEqual({
    routingResultId: "routing-result-1",
    answers: [{ questionId: question.questionId, text: statusQuestion.text, chosen: "404" }],
  });
});
