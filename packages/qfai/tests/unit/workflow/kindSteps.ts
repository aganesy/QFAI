// The steps a plan stage of each kind runs in the built-in plans, as a unit test's snapshot
// carries them, and the work-order entries a stage issued with its active steps holds.

import { stepRefs } from "../../../src/core/workflow/steps.js";
import type { PlanStep } from "../../../src/core/workflow/types.js";

const proposed = (name: string): PlanStep => ({ name, when: "proposed" });

export const KIND_STEPS: Record<string, PlanStep[]> = {
  maintenance: [{ name: "maintain-edit" }],
  diagnose: [{ name: "implement-diagnose" }],
  sdd_append: [{ name: "sdd-story" }, { name: "sdd-gate" }],
  test_fix: [
    { name: "atdd-test-fix", when: "test_defect_acceptance_layer" },
    { name: "implement-test-fix", when: "test_defect_example_layer" },
  ],
  regression_fix: [{ name: "implement-regression-fix" }],
  sdd: [
    { name: "sdd-triage" },
    { name: "sdd-flow" },
    { name: "sdd-story" },
    { name: "sdd-contract" },
    proposed("common-design-md"),
    { name: "sdd-cycle" },
    { name: "sdd-gate" },
  ],
  sdd_delta: [
    { name: "sdd-triage" },
    proposed("sdd-flow"),
    { name: "sdd-story" },
    proposed("sdd-contract"),
    proposed("common-design-md"),
    { name: "sdd-gate" },
  ],
  prototype: [
    { name: "prototyping-grill" },
    { name: "prototyping-preflight" },
    { name: "prototyping-loop" },
    { name: "prototyping-handoff" },
  ],
  acceptance: [{ name: "atdd-scaffold" }, proposed("atdd-credentials"), { name: "atdd-author" }],
  implement: [{ name: "implement-tdd" }, { name: "implement-checkpoint" }],
  verify: [{ name: "verify-context" }, { name: "verify-qfai-gate" }, { name: "verify-repo-gate" }],
  discussion: [
    { name: "discussion-research" },
    { name: "discussion-interview" },
    { name: "discussion-pack" },
    { name: "discussion-oq" },
    proposed("discussion-uiux"),
  ],
};

// A plan stage of a kind, carrying that kind's steps.
export function planStage(stageInstanceId: string, stageKind: string, when?: string) {
  const steps = KIND_STEPS[stageKind];
  if (!steps) throw new Error(`no steps for stage kind ${stageKind}`);
  return { stageInstanceId, stageKind, steps, ...(when ? { when } : {}) };
}

// The `steps` of a work order that runs the named steps.
export function issuedSteps(...names: string[]) {
  return stepRefs(names);
}

// The `steps` of a work order issued for a stage of a kind with no step proposed: every step
// that runs without a proposal. A `test_fix` stage names its layer instead.
export function kindSteps(stageKind: string) {
  const steps = KIND_STEPS[stageKind] ?? [];
  return stepRefs(steps.filter((step) => step.when === undefined).map((step) => step.name));
}
