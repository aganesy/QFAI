// QFAI:AC-0001-0186-01
// QFAI:EX-0001-0186-01
// QFAI:AC-0001-0220-05
// QFAI:EX-0001-0220-22

import { expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";

it("Load the shipped fix-defect", async () => {
  const fixDefect = (await loadBuiltInPlans()).find((plan) => plan.route === "fix-defect");

  expect({
    stages: fixDefect?.stages.map((stage) => stage.kind),
    implement: fixDefect?.stages[1]?.steps,
    verify: fixDefect?.stages.at(-2)?.steps.map((step) => step.name),
  }).toEqual({
    stages: ["diagnose", "implement", "verify", "verify", "verify"],
    implement: [
      { name: "sdd-story", passThrough: true },
      { name: "sdd-gate" },
      { name: "implement-tdd" },
    ],
    verify: ["verify-qfai-gate", "verify-repo-gate"],
  });
});
