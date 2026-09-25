// QFAI:EX-0001-0192-02
// QFAI:EX-0001-0192-44

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("A proceed answer records a bound human decision used by the SDD work order", () => {
  const question = {
    questionId: "question-3-1",
    kind: "create" as const,
    text: "Create a story in BF-0001 for customer notification email registration?",
    options: [
      {
        optionId: "create",
        label: "Create it",
        description: "Story authoring writes the new story.",
        effect: "proceed" as const,
      },
      {
        optionId: "decline",
        label: "Do not create it",
        description: "The run ends without creating the story.",
        effect: "stop" as const,
      },
    ],
    selection: { min: 1 as const, max: 1 as const },
    recommendation: "create",
    story: {
      goal: "Customer notification email registration",
      covers: ["Up to five unique emails per customer"],
      excludes: ["Notification delivery"],
      flowId: "BF-0001",
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
  const next =
    decision.verdict.ok && decision.verdict.run?.state === "ready" && authorization
      ? decide(
          { run: decision.verdict.run, plan, approval: authorization },
          { operation: "next" },
          {},
        )
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
        kind: "new_story",
        slotId: question.story?.slotId,
        story: {
          goal: question.story?.goal,
          covers: question.story?.covers,
          excludes: question.story?.excludes,
          flowId: question.story?.flowId,
        },
      },
    }),
    sddWorkOrder: {
      stageKind: "sdd",
      target: { kind: "new_story", slotId: question.story?.slotId },
      authorizationRefsMatch: true,
    },
  };
  expect(actual).toEqual(expected);
});

it("missing persisted CREATE authorization at SDD issue", () => {
  const story = {
    goal: "Customer notification email registration",
    covers: ["Up to five unique emails per customer"],
    excludes: ["Notification delivery"],
    flowId: "BF-0001",
  };
  const readySnapshot = {
    run: { id: "run-feature", state: "ready", sequence: 5 },
    plan: {
      route: "feature",
      stages: [
        { stageInstanceId: "feature-sdd", stageKind: "sdd" },
        { stageInstanceId: "feature-verify", stageKind: "verify" },
      ],
    },
    approval: {
      kind: "human_decision",
      operation: "CREATE",
      effect: "proceed",
      target: { kind: "new_story", slotId: "slot-3-1", story },
    },
  };

  const next = decide(readySnapshot, { operation: "next" }, {});

  const actual = {
    ok: next.verdict.ok,
    state: next.verdict.run?.state,
    workOrder: next.verdict.workOrder ?? null,
    questions: (next.verdict.questions ?? []).map((question) => ({
      kind: question.kind,
      slotId: question.story?.slotId,
      goal: question.story?.goal,
    })),
    issuedEvents: next.events.filter((event) => event.type === "work-order-issued").length,
  };
  const expected = {
    ok: true,
    state: "awaiting_input",
    workOrder: null,
    questions: [{ kind: "create", slotId: "slot-3-1", goal: story.goal }],
    issuedEvents: 0,
  };
  expect(actual).toEqual(expected);
});
