// QFAI:EX-0001-0192-45

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { parseRouteReferences } from "../../../src/core/workflow/parse.js";

function acceptRouting(proposal: { expectedBehaviorRefs: unknown[]; observedRefs: unknown[] }) {
  const snapshot = {
    run: { id: "run-reference-shape", state: "routing", sequence: 2 },
    outstandingWorkOrder: {
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      stageKind: "route",
    },
  };
  const parsed = parseRouteReferences(proposal);
  const decision = parsed.ok
    ? decide(
        snapshot,
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
              candidateRoute: "feature",
              expectedBehaviorRefs: parsed.expectedBehaviorRefs,
              observedRefs: parsed.observedRefs,
              newStories: [
                {
                  goal: "Customer notification email registration",
                  covers: ["One notification email per customer"],
                  excludes: ["Notification delivery"],
                  evidence: ["request"],
                  flowId: "BF-0001",
                },
              ],
              requiredStages: ["sdd", "verify"],
            },
          },
        },
        { pathExistence: { "src/notify.ts": true } },
      )
    : null;
  return {
    error: parsed.ok ? null : parsed.error,
    state: decision?.verdict.run?.state ?? snapshot.run.state,
    events: decision?.events ?? [],
  };
}

it("bare string in expectedBehaviorRefs", () => {
  const actual = acceptRouting({
    expectedBehaviorRefs: ["request"],
    observedRefs: [{ kind: "path", ref: "src/notify.ts" }],
  });
  const expected = {
    error: {
      code: "invalid-input",
      message: expect.any(String),
      reasons: [{ reason: "schema", subject: "expectedBehaviorRefs[0]" }],
    },
    state: "routing",
    events: [],
  };
  expect(actual).toEqual(expected);
});

it("bare string in observedRefs", () => {
  const actual = acceptRouting({
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: ["src/notify.ts"],
  });
  const expected = {
    error: {
      code: "invalid-input",
      message: expect.any(String),
      reasons: [{ reason: "schema", subject: "observedRefs[0]" }],
    },
    state: "routing",
    events: [],
  };
  expect(actual).toEqual(expected);
});
