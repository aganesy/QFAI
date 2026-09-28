// QFAI:EX-0001-0194-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { kindSteps, planStage } from "./kindSteps.js";

const plan = {
  route: "bugfix",
  stages: [
    planStage("bugfix-diagnose", "diagnose"),
    planStage("bugfix-test-fix", "test_fix"),
    planStage("bugfix-verify", "verify"),
  ],
};

// The test-fix work order a defective-test diagnosis leads to, whose first matched ID is
// `firstMatched`.
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

// Both test-fix steps run whatever the layer; the one that does not own the layer passes.
const matrix: [string, string][] = [
  ["business-flow", "BF-0007"],
  ["acceptance-criterion", "AC-0007-0002-01"],
  ["example", "EX-0007-0002-01"],
];

for (const [title, firstMatched] of matrix) {
  it(title, () => {
    expect(testFixStepsFor(firstMatched)).toEqual(["test_fix", kindSteps("test_fix")]);
  });
}
