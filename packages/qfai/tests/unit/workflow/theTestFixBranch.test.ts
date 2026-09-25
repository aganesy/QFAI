// QFAI:SPEC-0018:TC-0018-0077

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

function testFixSkillFor(layer: string, tcLevels: string[]) {
  const decision = decide(
    {
      run: { id: "run-test-fix", state: "ready", sequence: 6 },
      plan,
      specBinding: { specId: "spec-0007" },
      diagnosis: {
        verdict: "defective-test",
        reproductionRef: "evidence/defective-test.json",
        matchedRowIds: ["TDD-0004"],
      },
      acceptedStages: [
        { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    {
      ledger: {
        specId: "spec-0007",
        rows: [{ rowId: "TDD-0004", status: "done", digest: "4".repeat(64), layer, tcLevels }],
      },
    },
  );
  const workOrder = decision.verdict.workOrder;
  return [workOrder?.stageKind, workOrder?.executor?.skill, workOrder?.operation];
}

const matrix: [string, string, string[], string][] = [
  ["TC-0018-0077 (TDD-0091): e2e", "E2E", ["L3"], "qfai-atdd"],
  ["TC-0018-0077 (TDD-0092): api", "API", ["L3"], "qfai-atdd"],
  ["TC-0018-0077 (TDD-0093): integration-l3", "Integration", ["L2", "L3"], "qfai-atdd"],
  ["TC-0018-0077 (TDD-0094): integration-l1-l2", "Integration", ["L1", "L2"], "qfai-implement"],
  ["TC-0018-0077 (TDD-0095): unit", "Unit", ["L1"], "qfai-implement"],
  ["TC-0018-0077 (TDD-0096): component", "Component", ["L2"], "qfai-implement"],
];

for (const [title, layer, tcLevels, skill] of matrix) {
  it(title, () => {
    expect(testFixSkillFor(layer, tcLevels)).toEqual(["test_fix", skill, "test-fix"]);
  });
}
