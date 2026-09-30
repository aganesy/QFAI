// The steps a plan stage of each kind runs in the built-in plans, as a unit test's snapshot
// carries them, and the work-order entries a stage issued with those steps holds.

import { stepRefs, stepServes } from "../../../src/core/workflow/steps.js";
import type { PlanStep } from "../../../src/core/workflow/types.js";

const passThrough = (name: string): PlanStep => ({ name, passThrough: true });

export const KIND_STEPS: Record<string, PlanStep[]> = {
  maintenance: [{ name: "maintain-edit" }],
  diagnose: [{ name: "implement-diagnose" }],
  sdd_append: [passThrough("sdd-story"), { name: "sdd-gate" }],
  test_fix: [passThrough("atdd-test-fix"), passThrough("implement-test-fix")],
  regression_fix: [{ name: "implement-regression-fix" }],
  sdd: [
    { name: "sdd-triage" },
    passThrough("sdd-flow"),
    { name: "sdd-story" },
    passThrough("sdd-contract"),
    passThrough("common-design-md"),
    passThrough("sdd-cycle"),
    { name: "sdd-gate" },
  ],
  prototype: [
    { name: "prototyping-grill" },
    { name: "prototyping-preflight" },
    { name: "prototyping-loop" },
    { name: "prototyping-handoff" },
  ],
  acceptance: [
    { name: "atdd-scaffold" },
    passThrough("atdd-credentials"),
    passThrough("atdd-author"),
  ],
  implement: [{ name: "implement-tdd" }, { name: "implement-checkpoint" }],
  verify: [
    passThrough("verify-change-note"),
    { name: "verify-context" },
    { name: "verify-qfai-gate" },
    { name: "verify-repo-gate" },
  ],
  triage: [{ name: "triage-close" }],
  discussion: [
    { name: "discussion-research" },
    { name: "discussion-interview" },
    { name: "discussion-pack" },
    { name: "discussion-oq" },
    passThrough("discussion-uiux"),
  ],
};

// A plan stage of a kind, carrying that kind's steps.
export function planStage(stageInstanceId: string, stageKind: string) {
  const steps = KIND_STEPS[stageKind];
  if (!steps) throw new Error(`no steps for stage kind ${stageKind}`);
  return { stageInstanceId, stageKind, steps };
}

// The `steps` of a work order that runs the named steps, none of them pass-through.
export function issuedSteps(...names: string[]) {
  return stepRefs(names);
}

// The `steps` of a work order issued for a stage of a kind: every step the kind runs.
export function kindSteps(stageKind: string) {
  return stepRefs(KIND_STEPS[stageKind] ?? []);
}

// The `steps` of a repair work order for a stage of a kind: the steps that serve `owner`.
export function servedSteps(stageKind: string, owner: string) {
  return stepRefs((KIND_STEPS[stageKind] ?? []).filter((step) => stepServes(step.name, owner)));
}
