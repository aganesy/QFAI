// QFAI:EX-0001-0193-01
// QFAI:EX-0001-0193-13

import { expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";

it("Load the shipped bugfix", async () => {
  const { bugfix } = await loadBuiltInPlans();

  expect({
    stages: bugfix.stages.map((stage) => [stage.kind, stage.when]),
    last: bugfix.stages.at(-1)?.operation,
  }).toEqual({
    stages: [
      ["diagnose", "always"],
      ["sdd_append", "missing_example_needed"],
      ["acceptance", "acceptance_obligations_unmet"],
      ["implement", "diagnosis_missing_test"],
      ["regression_fix", "regression_found"],
      ["test_fix", "test_defect_found"],
      ["verify", "always"],
    ],
    last: "verify-full",
  });
});
