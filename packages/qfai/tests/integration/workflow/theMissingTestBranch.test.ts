// QFAI:AC-0001-0186-01

import { expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";

// QFAI:EX-0001-0186-01
// QFAI:EX-0001-0186-13
it("Load the shipped fix-defect", async () => {
  const fixDefect = (await loadBuiltInPlans()).find((plan) => plan.route === "fix-defect");

  expect({
    stages: fixDefect?.stages.map((stage) => stage.kind),
    append: fixDefect?.stages[1]?.steps,
    last: fixDefect?.stages.at(-1)?.steps.map((step) => step.name),
  }).toEqual({
    stages: ["diagnose", "sdd_append", "acceptance", "implement", "verify"],
    append: [{ name: "sdd-story", passThrough: true }, { name: "sdd-gate" }],
    last: ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"],
  });
});
