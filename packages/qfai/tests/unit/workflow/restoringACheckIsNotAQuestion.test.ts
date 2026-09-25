// QFAI:SPEC-0018:TC-0018-0085

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const bugfixStages = [
  ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
  [
    "bugfix-acceptance",
    "acceptance",
    "qfai-atdd",
    "author-acceptance-tests",
    "acceptance_obligations_unmet",
  ],
  [
    "bugfix-regression-fix",
    "regression_fix",
    "qfai-implement",
    "regression-fix",
    "regression_found",
  ],
  ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when,
}));
const runtimeHeavy = ["completion-reviewer", "qa-gatekeeper"];
const facts = {
  plans: { bugfix: { route: "bugfix", stages: bugfixStages } },
  specs: { "spec-0007": { lifecycle: "active" } },
  acceptanceObligationsUnmet: true,
  reviewerRoles: {
    "qfai-implement": runtimeHeavy,
    "qfai-atdd": ["completion-reviewer"],
    "qfai-verify": runtimeHeavy,
  },
};
const specBinding = { specId: "spec-0007" };
const diagnosis = {
  verdict: "regression",
  reproductionRef: "evidence/regression.json",
  matchedRowIds: ["TDD-0004"],
};

function routeRestoringACheck() {
  return decide(
    {
      run: { id: "run-restored", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "routing",
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
          candidateRoute: "bugfix",
          goal: "Restore the permission check on the export endpoint.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedSpecIds: ["spec-0007"],
          riskSignals: ["authorization-restored"],
          unresolvedQuestions: [],
          newCapabilities: [],
          proposedWriteScope: ["src/export/**"],
          protectedTargets: [],
          requiredStages: ["diagnose", "verify"],
        },
      },
    },
    facts,
  );
}

it("TC-0018-0085 (TDD-0111): A bugfix routing result whose only risk signal is authorization-restored", () => {
  const routed = routeRestoringACheck();
  expect(routed.verdict.run?.state).toBe("ready");
  expect(routed.verdict.questions).toBeUndefined();
  const plan = routed.verdict.plan;
  const run = routed.verdict.run;
  if (!plan || !run) throw new Error("the routing result is accepted with a plan");

  const accepted = bugfixStages.map(({ stageInstanceId, stageKind }) => ({
    stageInstanceId,
    stageKind,
    outcome: "accepted",
  }));
  const rolesByStage = [0, 1, 2, 3].map((count) => {
    const issued = decide(
      {
        run,
        plan,
        specBinding,
        diagnosis: count > 0 ? diagnosis : null,
        acceptedStages: accepted.slice(0, count),
      },
      { operation: "next" },
      facts,
    );
    const workOrder = issued.verdict.workOrder;
    return [workOrder?.executor?.skill, workOrder?.requiredReviewerRoles];
  });

  const heavy = ["completion-reviewer", "qa-gatekeeper", "implementation-reviewer"];
  expect(rolesByStage).toEqual([
    ["qfai-implement", heavy],
    ["qfai-atdd", heavy],
    ["qfai-implement", heavy],
    ["qfai-verify", runtimeHeavy],
  ]);
});
