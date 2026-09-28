// QFAI:EX-0001-0197-02

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";

type Result = NonNullable<Parameters<typeof decide>[1]["result"]>;

function routingResult(requestKind: string): Result {
  return {
    resultId: "routing-result-1",
    workOrderId: "routing-1",
    stageInstanceId: "routing-stage-1",
    attempt: 1,
    expectedSequence: 2,
    outcome: "accepted",
    testObservation: "not_applicable",
    actor: { agentInstance: "router-1" },
    proposal: {
      requestKind,
      extraction: extractionFor("answer-question"),
      goal: "Explain how notification emails are sent.",
      expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
      observedRefs: [],
      affectedFlowIds: [],
      riskSignals: [],
      unresolvedQuestions: [],
      newStories: [],
      proposedWriteScope: [],
      protectedTargets: [],
      rationale: "The request asks how something works.",
    },
  };
}

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
    { operation: "accept", result: routingResult(requestKind) },
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

function schemaFaults(requestKind: string) {
  return stageResultRefusals({ ...routingResult(requestKind) });
}

it("A request kind outside the closed set is refused as a shape", () => {
  expect({
    readOnly: schemaFaults("read_only"),
    planOnly: schemaFaults("plan_only"),
    change: schemaFaults("change"),
    routed: schemaFaults("routed"),
  }).toEqual({
    readOnly: [{ reason: "schema", subject: "proposal.requestKind" }],
    planOnly: [{ reason: "schema", subject: "proposal.requestKind" }],
    change: [{ reason: "schema", subject: "proposal.requestKind" }],
    routed: [],
  });
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
