// QFAI:EX-0001-0185-07

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planStage } from "./kindSteps.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  RouteReference,
} from "../../../src/core/workflow/parse.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";

it("Decide accept of a routing result whose proposal passes every check", () => {
  const boundedPlan = {
    route: "add-feature",
    stages: [
      planStage("sdd-delta", "sdd"),
      planStage("implement", "implement"),
      planStage("verify", "verify"),
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
        requestKind: "routed",
        extraction: extractionFor("add-feature"),
        goal: "Reject an empty notification email with a clear message.",
        expectedBehaviorRefs: [
          { kind: "request", ref: "request" },
        ] satisfies RouteReference<NormativeReferenceKind>[],
        observedRefs: [
          { kind: "path", ref: "src/notify/email.ts" },
        ] satisfies RouteReference<ObservedReferenceKind>[],
        affectedFlowIds: ["BF-0007"],
        newStories: [],
        proposedWriteScope: ["src/notify/**", "tests/notify/**"],
      },
    },
  };
  const facts = {
    pathExistence: { "src/notify/email.ts": true },
    plans: { "add-feature": boundedPlan },
    flows: ["BF-0007"],
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
