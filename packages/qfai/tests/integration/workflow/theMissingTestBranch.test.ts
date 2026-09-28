// QFAI:AC-0001-0193-01
// QFAI:EX-0001-0193-01
// QFAI:EX-0001-0193-13

import { expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";

it("Load the shipped bugfix", async () => {
  const { bugfix } = await loadBuiltInPlans();

  expect({
    stages: bugfix.stages.map((stage) => stage.kind),
    append: bugfix.stages[1]?.steps,
    last: bugfix.stages.at(-1)?.steps.map((step) => step.name),
  }).toEqual({
    stages: [
      "diagnose",
      "sdd_append",
      "acceptance",
      "implement",
      "regression_fix",
      "test_fix",
      "verify",
    ],
    append: [{ name: "sdd-story", passThrough: true }, { name: "sdd-gate" }],
    last: ["verify-context", "verify-qfai-gate", "verify-repo-gate"],
  });
});
