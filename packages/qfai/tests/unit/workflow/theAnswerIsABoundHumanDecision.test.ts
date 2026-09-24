// QFAI:SPEC-0018:TC-0018-0003

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("TC-0018-0003 (TDD-0003): A proceed answer records a bound human decision used by the SDD work order", () => {
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
  const plan = {
    route: "feature",
    stages: [
      { stageInstanceId: "feature-sdd", stageKind: "sdd" },
      { stageInstanceId: "feature-verify", stageKind: "verify" },
    ],
  };
  const awaitingSnapshot = {
    run: { id: "run-feature", state: "awaiting_input", sequence: 4 },
    openQuestions: [question],
    plan,
    scopeDigest: "a".repeat(64),
  };
  const decisionInput = {
    operation: "decision",
    questionId: question.questionId,
    answer: { optionIds: ["create"] },
    answeredBy: "operator-1",
    expectedSequence: awaitingSnapshot.run.sequence,
  };
  const decision = decide(awaitingSnapshot, decisionInput, {
    now: "2026-09-24T00:00:00.000Z",
  });

  const authorizationEvents = decision.events.filter(
    (event) => event.type === "authorization-recorded",
  );
  const authorizationValue =
    authorizationEvents[0] && "authorization" in authorizationEvents[0]
      ? authorizationEvents[0].authorization
      : null;
  const authorization =
    authorizationValue && typeof authorizationValue === "object" ? authorizationValue : null;
  const authorizationId =
    authorization && "authorizationId" in authorization ? authorization.authorizationId : null;
  const authorizationRef =
    typeof authorizationId === "string" ? `authorizations/${authorizationId}.json` : null;
  const approval = authorization as {
    kind: string;
    operation: string;
    effect: string;
    target?: { kind: string; slotId: string };
  } | null;
  const readySnapshot = {
    run: decision.verdict.run ?? awaitingSnapshot.run,
    plan,
    approval: approval ?? undefined,
    approvalRef: authorizationRef,
  };
  const next =
    decision.verdict.ok && decision.verdict.run?.state === "ready" && authorization
      ? decide(readySnapshot, { operation: "next" }, {})
      : null;
  const workOrder = next?.verdict.workOrder;
  const target = workOrder && "target" in workOrder ? workOrder.target : null;
  const authorizationRefs =
    workOrder && "authorizationRefs" in workOrder ? workOrder.authorizationRefs : null;

  const actual = {
    decisionState: decision.verdict.run?.state,
    humanDecisionCount: authorizationEvents.length,
    authorization,
    sddWorkOrder: {
      stageKind: workOrder?.stageKind,
      target,
      authorizationRefsMatch:
        authorizationRef !== null &&
        Array.isArray(authorizationRefs) &&
        authorizationRefs.length === 1 &&
        authorizationRefs[0] === authorizationRef,
    },
  };
  const expected = {
    decisionState: "ready",
    humanDecisionCount: 1,
    authorization: expect.objectContaining({
      authorizationId: expect.any(String),
      runId: "run-feature",
      kind: "human_decision",
      capture: "agent_captured",
      questionId: question.questionId,
      question: {
        text: question.text,
        options: question.options,
        selection: question.selection,
      },
      answer: { optionIds: ["create"] },
      effect: "proceed",
      answeredBy: "operator-1",
      operation: "CREATE",
      scopeDigest: awaitingSnapshot.scopeDigest,
      recordedAt: "2026-09-24T00:00:00.000Z",
      target: {
        kind: "new_capability",
        slotId: question.capability.slotId,
        capability: {
          goal: question.capability.goal,
          covers: question.capability.covers,
          excludes: question.capability.excludes,
        },
      },
    }),
    sddWorkOrder: {
      stageKind: "sdd",
      target: { kind: "new_capability", slotId: question.capability.slotId },
      authorizationRefsMatch: true,
    },
  };
  expect(actual).toEqual(expected);
});
