// QFAI:SPEC-0018:TC-0018-0008

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("TC-0018-0008 (TDD-0013): Declining CREATE cancels the run without a binding or work order", () => {
  const question = {
    questionId: "question-3-1",
    kind: "create" as const,
    text: "Create a capability for customer notification email registration?",
    options: [
      {
        optionId: "create",
        label: "Create it",
        description: "SDD writes the new capability's spec.",
        effect: "proceed" as const,
      },
      {
        optionId: "decline",
        label: "Do not create it",
        description: "The run ends without creating the capability.",
        effect: "stop" as const,
      },
    ],
    selection: { min: 1 as const, max: 1 as const },
    recommendation: "create",
    capability: {
      goal: "Customer notification email registration",
      covers: ["Up to five unique emails per customer"],
      excludes: ["Notification delivery"],
      slotId: "slot-3-1",
    },
  };
  const snapshot = {
    run: { id: "run-declined", state: "awaiting_input", sequence: 4 },
    openQuestions: [question],
    scopeDigest: "a".repeat(64),
  };
  const input = {
    operation: "decision",
    questionId: question.questionId,
    answer: { optionIds: ["decline"] },
    answeredBy: "operator-1",
    expectedSequence: snapshot.run.sequence,
  };

  const decision = decide(snapshot, input, { now: "2026-09-24T00:00:00.000Z" });
  const authorization = decision.events.find(
    (event) => event.type === "authorization-recorded",
  )?.authorization;
  const actual = {
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    stopEvents: decision.events.filter((event) => event.type === "authorized-stop").length,
    authorization: authorization
      ? {
          kind: authorization.kind,
          capture: authorization.capture,
          operation: authorization.operation,
          effect: authorization.effect,
          optionIds: "optionIds" in authorization.answer ? authorization.answer.optionIds : [],
          slotId: authorization.target?.slotId,
        }
      : null,
    bindingEvents: decision.events.filter((event) => event.type === "binding-recorded").length,
    workOrderEvents: decision.events.filter((event) => event.type === "work-order-issued").length,
    workOrder: decision.verdict.workOrder ?? null,
  };
  const expected = {
    ok: true,
    state: "cancelled",
    stopEvents: 1,
    authorization: {
      kind: "human_decision",
      capture: "agent_captured",
      operation: "CREATE",
      effect: "stop",
      optionIds: ["decline"],
      slotId: question.capability.slotId,
    },
    bindingEvents: 0,
    workOrderEvents: 0,
    workOrder: null,
  };
  expect(actual).toEqual(expected);
});
