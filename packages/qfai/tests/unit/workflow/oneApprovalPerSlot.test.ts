// QFAI:EX-0001-0192-03

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  RouteReference,
} from "../../../src/core/workflow/parse.js";

it("Two new stories open two CREATE questions in one routing round", () => {
  const snapshot = {
    run: { id: "run-two-stories", state: "routing", sequence: 2 },
    outstandingWorkOrder: {
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      stageKind: "route",
    },
  };
  const input = {
    operation: "accept",
    result: {
      resultId: "routing-result-1",
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      expectedSequence: 2,
      outcome: "accepted",
      testObservation: "not_applicable",
      changedFiles: [],
      artifactRefs: [],
      gateResults: [],
      reviewResults: [],
      debts: [],
      proposal: {
        requestKind: "change",
        candidateRoute: "feature",
        goal: "Let customers manage notification email addresses and delivery preferences.",
        expectedBehaviorRefs: [
          { kind: "request", ref: "request" },
        ] satisfies RouteReference<NormativeReferenceKind>[],
        observedRefs: [] satisfies RouteReference<ObservedReferenceKind>[],
        affectedFlowIds: [],
        riskSignals: [],
        unresolvedQuestions: [],
        newStories: [
          {
            goal: "Customer notification email registration",
            covers: ["Up to five unique emails per customer"],
            excludes: ["Notification delivery"],
            evidence: ["request"],
            flowId: "BF-0001",
          },
          {
            goal: "Notification delivery preferences",
            covers: ["Customers choose delivery channels"],
            excludes: ["Email address registration"],
            evidence: ["request"],
            flowId: "BF-0001",
          },
        ],
        proposedWriteScope: [".qfai/specs/BF-0018/**"],
        protectedTargets: [],
        requiredStages: ["sdd", "verify"],
        rationale: "Neither story exists in the current scope.",
      },
    },
  };

  const decision = decide(snapshot, input, {});
  const opened = decision.events
    .filter((event) => event.type === "question-opened")
    .map((event) => event.question);
  const returned = decision.verdict.questions ?? [];
  const slots = opened.map((question) => question?.story?.slotId);
  const actual = {
    state: decision.verdict.run?.state,
    opened: opened
      .map((question) => ({
        kind: question?.kind,
        goal: question?.story?.goal,
        slotId: question?.story?.slotId,
      }))
      .sort((left, right) => (left.goal ?? "").localeCompare(right.goal ?? "")),
    sameRound:
      returned.length === 2 &&
      returned.length === opened.length &&
      new Set(opened.map((question) => question?.questionId)).size === 2 &&
      returned.every((question) => opened.some((item) => item?.questionId === question.questionId)),
    distinctSlots: slots.length === 2 && slots.every(Boolean) && new Set(slots).size === 2,
    workOrders: decision.events.filter((event) => event.type === "work-order-issued").length,
  };
  const expected = {
    state: "awaiting_input",
    opened: [
      {
        kind: "create",
        goal: "Customer notification email registration",
        slotId: expect.any(String),
      },
      {
        kind: "create",
        goal: "Notification delivery preferences",
        slotId: expect.any(String),
      },
    ],
    sameRound: true,
    distinctSlots: true,
    workOrders: 0,
  };
  expect(actual).toEqual(expected);
});
