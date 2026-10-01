import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { kindSteps, planStage } from "./kindSteps.js";

const plan = {
  route: "add-feature",
  stages: [planStage("bounded-sdd-delta", "sdd"), planStage("bounded-implement", "implement")],
};
const run = { id: "run-reviews", state: "running", sequence: 4 };
const workOrder = {
  workOrderId: "work-order-bounded-implement-1",
  stageInstanceId: "bounded-implement",
  attempt: 1,
  stageKind: "implement",
  target: { kind: "flow" as const, flowId: "BF-0007" },
  steps: kindSteps("implement"),
  requiredReviewerRoles: ["completion-reviewer", "qa-gatekeeper"],
};

const review = (role: string, verdict: string) => ({
  role,
  agentInstance: `${role}-1`,
  verdict,
  reportRef: `${role}.md`,
});

function acceptWith(reviewResults: ReturnType<typeof review>[]) {
  const decision = decide(
    {
      run,
      plan,
      flowBinding: { flowId: "BF-0007" },
      acceptedStages: [
        { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd", outcome: "accepted" },
      ],
      outstandingWorkOrder: workOrder,
    },
    {
      operation: "accept",
      result: {
        resultId: "result-implement",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "accepted",
        actor: { agentInstance: "implement-1" },
        reviewResults,
      },
    },
    {},
  );
  const error = decision.verdict.error;
  return {
    ok: decision.verdict.ok,
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events.length,
  };
}

// QFAI:EX-0001-0209-09
it("Accept an implement result missing a qa-gatekeeper PASS, then one with a REVISE, then one with both PASS", () => {
  const refused = {
    ok: false,
    state: "running",
    reasons: [{ reason: "review-missing", subject: "qa-gatekeeper" }],
    events: 0,
  };

  expect([
    acceptWith([review("completion-reviewer", "PASS")]),
    acceptWith([review("completion-reviewer", "PASS"), review("qa-gatekeeper", "REVISE")]),
    acceptWith([review("completion-reviewer", "PASS"), review("qa-gatekeeper", "PASS")]),
  ]).toEqual([refused, refused, { ok: true, state: "ready", reasons: [], events: 1 }]);
});
