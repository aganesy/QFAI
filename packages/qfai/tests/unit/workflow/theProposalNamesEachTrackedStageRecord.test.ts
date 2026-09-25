// QFAI:SPEC-0018:TC-0018-0255

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

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

// Accepts a routing result whose write scope names the pack's own files and `record`.
function routeNaming(record: string) {
  const decision = decide(
    {
      run: { id: "run-protected", state: "routing", sequence: 2 },
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
          goal: "Notify the owner when an export fails.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedSpecIds: ["spec-0001"],
          newCapabilities: [],
          proposedWriteScope: [".qfai/specs/spec-0001/01_Spec.md", "src/notify/**", record],
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    {
      plans: { "bounded-change": { route: "bounded-change", stages: boundedStages } },
      specs: { "spec-0001": { lifecycle: "active" } },
    },
  );
  const error = decision.verdict.error;
  return {
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    state: decision.verdict.run?.state,
    events: decision.events.length,
  };
}

const records: [string, string][] = [
  ["TC-0018-0255 (TDD-0503): decisions-cr", ".qfai/decisions/CR-20260924-0001.md"],
  ["TC-0018-0255 (TDD-0504): evidence-decisions", ".qfai/evidence/decisions/"],
  ["TC-0018-0255 (TDD-0505): change-request", ".qfai/evidence/change-request-20260924-0001.md"],
  ["TC-0018-0255 (TDD-0506): decision-record", ".qfai/evidence/decision-0001.md"],
];

for (const [title, record] of records) {
  it(title, () => {
    expect(routeNaming(record)).toEqual({
      code: "proposal-refused",
      reasons: [{ reason: "protected-surface", subject: record }],
      state: "routing",
      events: 0,
    });
  });
}
