// QFAI:SPEC-0018:TC-0018-0065

import { expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";

it("TC-0018-0065 (TDD-0310): Load the shipped bugfix", async () => {
  const { bugfix } = await loadBuiltInPlans();
  const guarded = ["sdd_append", "acceptance", "regression_fix", "test_fix"];

  expect({
    kinds: bugfix.stages.map((stage) => stage.kind),
    predicates: bugfix.stages
      .filter((stage) => guarded.includes(stage.kind))
      .map((stage) => [stage.kind, stage.when]),
    last: bugfix.stages.at(-1)?.operation,
  }).toEqual({
    kinds: [
      "diagnose",
      "sdd_append",
      "acceptance",
      "implement",
      "regression_fix",
      "test_fix",
      "verify",
    ],
    predicates: [
      ["sdd_append", "missing_test_row_needed"],
      ["acceptance", "acceptance_obligations_unmet"],
      ["regression_fix", "regression_found"],
      ["test_fix", "test_defect_found"],
    ],
    last: "verify-full",
  });
});
