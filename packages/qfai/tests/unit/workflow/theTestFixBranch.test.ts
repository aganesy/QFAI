// QFAI:EX-0001-0194-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    ["bugfix-test-fix", "test_fix", "qfai-atdd", "test-fix", "test_defect_found"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when,
  })),
};

// The kind of the diagnosis's first matched ID decides who fixes the test.
function testFixSkillFor(firstMatched: string) {
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
  return [workOrder?.stageKind, workOrder?.executor?.skill, workOrder?.operation];
}

const matrix: [string, string, string][] = [
  ["business-flow", "BF-0007", "qfai-atdd"],
  ["acceptance-criterion", "AC-0007-0002-01", "qfai-atdd"],
  ["example", "EX-0007-0002-01", "qfai-implement"],
];

for (const [title, firstMatched, skill] of matrix) {
  it(title, () => {
    expect(testFixSkillFor(firstMatched)).toEqual(["test_fix", skill, "test-fix"]);
  });
}
