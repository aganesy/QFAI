// QFAI:SPEC-0018:TC-0018-0095
// QFAI:SPEC-0018:TC-0018-0096
// QFAI:SPEC-0018:TC-0018-0097
// QFAI:SPEC-0018:TC-0018-0098

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Input = Parameters<typeof decide>[1];
type AcceptResult = NonNullable<Input["result"]>;
type Question = NonNullable<Parameters<typeof decide>[0]["openQuestions"]>[number];

const plan = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-edit",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "non-normative-edit",
    },
    {
      stageInstanceId: "direct-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const specBinding = { specId: "spec-0007" };

function acceptCarrying(extra: Partial<AcceptResult>) {
  const issued = decide(
    { run: { id: "run-approve", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return null;
  const decision = decide(
    { run, plan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-direct-edit",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        ...extra,
      },
    },
    {},
  );
  return summary(decision);
}

const question: Question = {
  questionId: "question-4-1",
  kind: "decision",
  text: "The export also removes archived rows. Keep that?",
  options: [
    { optionId: "keep", label: "Keep it", description: "The run goes on.", effect: "proceed" },
    { optionId: "stop", label: "Stop", description: "The run ends here.", effect: "stop" },
  ],
  selection: { min: 1, max: 1 },
  recommendation: "stop",
};

function answer(extra: Partial<Input>) {
  const decision = decide(
    {
      run: { id: "run-approve", state: "awaiting_input", sequence: 4 },
      openQuestions: [question],
      scopeDigest: "a".repeat(64),
    },
    {
      operation: "decision",
      questionId: question.questionId,
      answer: { optionIds: ["keep"] },
      answeredBy: "operator-1",
      expectedSequence: 4,
      ...extra,
    },
    { now: "2026-09-25T00:00:00.000Z" },
  );
  return {
    ...summary(decision),
    authorizations: decision.events.flatMap((e) => e.authorization ?? []),
  };
}

function summary(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    ok: decision.verdict.ok,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    humanDecisions: decision.events.filter((event) => event.type === "authorization-recorded")
      .length,
  };
}

it("TC-0018-0095 (TDD-0132): A stage result carrying approved", () => {
  expect(acceptCarrying({ approved: true })).toEqual({
    ok: false,
    code: "invalid-input",
    reasons: [{ reason: "schema", subject: "approved" }],
    humanDecisions: 0,
  });
});

it("TC-0018-0096 (TDD-0133): A decision naming no open question, not a stop", () => {
  const { authorizations, ...actual } = answer({ questionId: "question-9-9" });
  expect({ ...actual, authorizations }).toEqual({
    ok: false,
    code: "no-open-question",
    reasons: [],
    humanDecisions: 0,
    authorizations: [],
  });
});

it("TC-0018-0097 (TDD-0134): A decision whose payload declares capture", () => {
  const { authorizations } = answer({ capture: "host_observed" });
  expect(authorizations.map((authorization) => authorization.capture)).toEqual(["agent_captured"]);
});

const derived: [string, "accept" | "decision", string][] = [
  ["TC-0018-0098 (TDD-0135): mode-at-accept", "accept", "mode"],
  ["TC-0018-0098 (TDD-0136): mode-at-decision", "decision", "mode"],
  ["TC-0018-0098 (TDD-0137): confidence-at-accept", "accept", "confidence"],
  ["TC-0018-0098 (TDD-0138): confidence-at-decision", "decision", "confidence"],
];

for (const [title, operation, kind] of derived) {
  it(title, () => {
    const authorization = { kind };
    const actual =
      operation === "accept"
        ? acceptCarrying({ authorization })
        : (({ authorizations: _recorded, ...rest }) => rest)(answer({ authorization }));
    expect(actual).toEqual({
      ok: false,
      code: "invalid-input",
      reasons: [{ reason: "authorization-kind", subject: "authorization" }],
      humanDecisions: 0,
    });
  });
}
