// QFAI:EX-0001-0192-39

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const boundedStages = [
  ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"],
  ["bounded-implement", "implement", "qfai-implement", "implement"],
  ["bounded-verify", "verify", "qfai-verify", "verify-full"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when: "always",
}));

const STORY = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001";

// Accepts a routing result whose write scope names the story's own files and `record`.
function routeNaming(record?: string) {
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
          affectedFlowIds: ["BF-0001"],
          newStories: [],
          proposedWriteScope: [
            `${STORY}/03_Example.md`,
            "src/notify/**",
            ...(record ? [record] : []),
          ],
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    {
      plans: { "bounded-change": { route: "bounded-change", stages: boundedStages } },
      flows: ["BF-0001"],
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
  ["decisions-table", ".qfai/spec/decisions.md"],
  ["open-questions-table", ".qfai/spec/open-questions.md"],
  ["decision-records", ".qfai/evidence/decision/"],
  ["run-evidence", ".qfai/evidence/workflow/run-20260924000000000/summary.json"],
  ["run-state", ".qfai/run/**"],
];

it("story-files-only", () => {
  expect(routeNaming()).toEqual({
    code: undefined,
    reasons: undefined,
    state: "ready",
    events: 2,
  });
});

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
