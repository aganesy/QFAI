// QFAI:EX-0001-0192-09

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { parseRouteReferences } from "../../../src/core/workflow/parse.js";

it("Decide accept of a routing result with normative references, observed references and a new", () => {
  const expectedBehaviorRefs = [
    { kind: "request", ref: "request" },
    { kind: "flow-id", ref: "BF-0007" },
  ];
  const observedRefs = [
    { kind: "path", ref: "src/notify/email.ts" },
    { kind: "evidence", ref: "tests/notify/email.test.ts" },
  ];
  const parsed = parseRouteReferences({ expectedBehaviorRefs, observedRefs });
  const decision = parsed.ok
    ? decide(
        {
          run: { id: "run-references", state: "routing", sequence: 2 },
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
              candidateRoute: "feature",
              goal: "Let each customer register a notification email.",
              expectedBehaviorRefs: parsed.expectedBehaviorRefs,
              observedRefs: parsed.observedRefs,
              affectedFlowIds: ["BF-0007"],
              newStories: [
                {
                  goal: "Customer notification email registration",
                  covers: ["One notification email per customer"],
                  excludes: ["Notification delivery"],
                  evidence: ["No spec names notification emails"],
                  flowId: "BF-0001",
                },
              ],
              proposedWriteScope: ["src/notify/**"],
              requiredStages: ["sdd", "verify"],
            },
          },
        },
        {
          pathExistence: { "src/notify/email.ts": true, "tests/notify/email.test.ts": true },
          flows: ["BF-0007"],
          plans: {
            feature: {
              route: "feature",
              stages: [
                { stageInstanceId: "sdd", stageKind: "sdd", when: "always" },
                { stageInstanceId: "verify", stageKind: "verify", when: "always" },
              ],
            },
          },
        },
      )
    : null;

  const actual = {
    state: decision?.verdict.run?.state,
    expectedBehaviorRefs: decision?.verdict.plan?.expectedBehaviorRefs,
    observedRefs: decision?.verdict.plan?.observedRefs,
    questionKinds: (decision?.verdict.questions ?? []).map((question) => question.kind),
    authorizations: (decision?.events ?? []).filter(
      (event) => event.type === "authorization-recorded",
    ).length,
  };
  const expected = {
    state: "awaiting_input",
    expectedBehaviorRefs,
    observedRefs,
    questionKinds: ["create"],
    authorizations: 0,
  };
  expect(actual).toEqual(expected);
});
