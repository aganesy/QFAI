// QFAI:SPEC-0018:TC-0018-0010

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  RouteReference,
} from "../../../src/core/workflow/parse.js";

it("TC-0018-0010 (TDD-0014): Decide accept of a routing result whose proposal passes every check", () => {
  const boundedPlan = {
    route: "bounded-change",
    stages: [
      {
        stageInstanceId: "sdd-delta",
        stageKind: "sdd_delta",
        skill: "qfai-sdd",
        operation: "delta-or-applicability-check",
        when: "always",
      },
      {
        stageInstanceId: "implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        when: "always",
      },
      {
        stageInstanceId: "verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        when: "always",
      },
    ],
  };
  const snapshot = {
    run: { id: "run-routing", state: "routing", sequence: 2 },
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
      proposal: {
        requestKind: "change",
        candidateRoute: "bounded-change",
        goal: "Reject an empty notification email with a clear message.",
        expectedBehaviorRefs: [
          { kind: "request", ref: "request" },
        ] satisfies RouteReference<NormativeReferenceKind>[],
        observedRefs: [
          { kind: "path", ref: "src/notify/email.ts" },
        ] satisfies RouteReference<ObservedReferenceKind>[],
        affectedSpecIds: ["spec-0007"],
        newCapabilities: [],
        proposedWriteScope: ["src/notify/**", "tests/notify/**"],
        requiredStages: ["sdd_delta", "implement", "verify"],
      },
    },
  };
  const facts = {
    pathExistence: { "src/notify/email.ts": true },
    plans: { "bounded-change": boundedPlan },
  };

  const decision = decide(snapshot, input, facts);

  const actual = {
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    plan: decision.verdict.plan,
    questions: decision.verdict.questions ?? [],
    questionEvents: decision.events.filter((event) => event.type === "question-opened").length,
  };
  const expected = {
    ok: true,
    state: "ready",
    plan: expect.objectContaining({
      goal: "Reject an empty notification email with a clear message.",
      stages: boundedPlan.stages,
      writeScope: ["src/notify/**", "tests/notify/**"],
    }),
    questions: [],
    questionEvents: 0,
  };
  expect(actual).toEqual(expected);
});
