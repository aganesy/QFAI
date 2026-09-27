// QFAI:EX-0001-0194-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { issuedSteps, planStage } from "./kindSteps.js";

const plan = {
  route: "bugfix",
  stages: [
    planStage("bugfix-diagnose", "diagnose", "always"),
    planStage("bugfix-test-fix", "test_fix", "test_defect_found"),
    planStage("bugfix-verify", "verify", "always"),
  ],
};

// The kind of the diagnosis's first matched ID decides which step fixes the test.
function testFixStepsFor(firstMatched: string) {
  const decision = decide(
    {
      run: { id: "run-test-fix", state: "ready", sequence: 6 },
      plan,
      flowBinding: { flowId: "BF-0007" },
      diagnosis: {
        verdict: "defective-test",
        reproductionRef: "evidence/defective-test.json",
        matchedIds: [firstMatched, "EX-0007-0002-02"],
      },
      acceptedStages: [
        { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    {},
  );
  const workOrder = decision.verdict.workOrder;
  return [workOrder?.stageKind, workOrder?.steps];
}

const matrix: [string, string, string][] = [
  ["business-flow", "BF-0007", "atdd-test-fix"],
  ["acceptance-criterion", "AC-0007-0002-01", "atdd-test-fix"],
  ["example", "EX-0007-0002-01", "implement-test-fix"],
];

for (const [title, firstMatched, step] of matrix) {
  it(title, () => {
    expect(testFixStepsFor(firstMatched)).toEqual(["test_fix", issuedSteps(step)]);
  });
}
