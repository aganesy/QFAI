// QFAI:EX-0001-0197-02

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

function acceptRequestKind(requestKind: string) {
  const decision = decide(
    {
      run: { id: "run-request-kind", state: "routing", sequence: 2 },
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
          requestKind,
          candidateRoute: null,
          goal: "Explain how notification emails are sent.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedFlowIds: [],
          riskSignals: [],
          unresolvedQuestions: [],
          newStories: [],
          proposedWriteScope: [],
          protectedTargets: [],
          requiredStages: [],
        },
      },
    },
    {},
  );
  const error = decision.verdict.error;
  return {
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    run: decision.verdict.run,
    events: decision.events,
  };
}

function scopeEscape(requestKind: string) {
  return {
    code: "proposal-refused",
    reasons: [{ reason: "scope-escape", subject: requestKind }],
    run: { id: "run-request-kind", state: "routing", sequence: 2 },
    events: [],
  };
}

it("read-only", () => {
  expect(acceptRequestKind("read_only")).toEqual(scopeEscape("read_only"));
});

it("plan-only", () => {
  expect(acceptRequestKind("plan_only")).toEqual(scopeEscape("plan_only"));
});

it("verify-only", () => {
  expect(acceptRequestKind("verify_only")).toEqual(scopeEscape("verify_only"));
});

it("resume", () => {
  expect(acceptRequestKind("resume")).toEqual(scopeEscape("resume"));
});

it("cancel", () => {
  expect(acceptRequestKind("cancel")).toEqual(scopeEscape("cancel"));
});

it("explicit-stage", () => {
  expect(acceptRequestKind("explicit_stage")).toEqual(scopeEscape("explicit_stage"));
});
