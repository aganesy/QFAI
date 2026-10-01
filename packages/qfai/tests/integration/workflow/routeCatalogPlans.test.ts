// QFAI:AC-0001-0220-01
// QFAI:AC-0001-0220-02
// QFAI:AC-0001-0220-03
// QFAI:AC-0001-0220-04
// QFAI:AC-0001-0220-05
// QFAI:AC-0001-0220-06
// QFAI:AC-0001-0220-07
// QFAI:AC-0001-0218-03

import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { loadBuiltInPlans, type WorkflowPlanFile } from "../../../src/core/workflow/plans.js";
import { flowBindingOf } from "../../../src/core/workflow/stages.js";
import type { PlanStages, PlanStep } from "../../../src/core/workflow/types.js";

// Each shipped plan, as its catalog example states it once loaded and planned with no modifier.
const CATALOG: [string, string][] = [
  [
    "close-no-change",
    "close (triage): triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "answer-question",
    "answer (triage, no review): triage-answer, triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "investigate-question",
    "answer (triage, no review): triage-investigate, triage-answer, triage-close; default modifiers none; decision points none; branch points triage-investigate; binds no flow",
  ],
  [
    "request-info",
    "ask (triage): triage-request-info; close (triage): triage-close; default modifiers none; decision points none; branch points triage-close; binds no flow",
  ],
  [
    "close-duplicate",
    "dedupe (triage): triage-dedupe; close (triage): triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "cluster-reports",
    "cluster (triage): triage-cluster; close (triage): triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "decide-acceptance",
    "clarify (discussion): discussion-research, discussion-interview; record (discussion): discussion-oq; close (triage): triage-close; default modifiers gate:user; decision points discussion-interview; branch points triage-close; binds no flow",
  ],
  [
    "decide-design",
    "discussion (discussion): discussion-research, discussion-interview, discussion-pack, discussion-uiux°, discussion-oq; close (triage): triage-close; default modifiers gate:user, review:heavy; decision points discussion-interview; branch points none; binds no flow",
  ],
  [
    "decompose-epic",
    "discussion (discussion): discussion-research, discussion-interview, discussion-pack, discussion-oq; split (triage): triage-decompose; close (triage): triage-close; default modifiers gate:user, review:heavy; decision points discussion-interview, triage-decompose; branch points none; binds no flow",
  ],
  [
    "retriage-bundle",
    "recheck (diagnose): implement-diagnose(read-only); split (triage): triage-decompose; close (triage): triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "repair-consistency",
    "diagnose (diagnose): implement-diagnose; sdd (sdd): sdd-triage, sdd-flow°, sdd-story°, sdd-contract°, sdd-cycle°, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points implement-diagnose, sdd-triage; binds one flow",
  ],
  [
    "sweep-guard",
    "diagnose (diagnose): implement-diagnose; sdd (sdd): sdd-triage, sdd-flow°, sdd-story°, sdd-contract°, sdd-cycle°, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-sweep, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points implement-sweep; branch points none; binds one flow",
  ],
  [
    "retire-mechanism",
    "diagnose (diagnose): implement-diagnose; decide (sdd): sdd-triage; remove (implement): implement-retire; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points none; binds one flow",
  ],
  [
    "restate-records",
    "diagnose (diagnose): implement-diagnose; spec (sdd): sdd-triage, sdd-story, sdd-contract°, sdd-gate; tests (test_fix): implement-test-fix°; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points none; binds one flow",
  ],
  [
    "add-feature",
    "sdd (sdd): sdd-triage, sdd-flow°, sdd-story, sdd-contract°, common-design-md°, sdd-cycle°, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; docs (maintenance): maintain-edit°; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points none; binds one flow",
  ],
  [
    "prototype-feature",
    "sdd (sdd): sdd-triage, sdd-flow°, sdd-story, sdd-contract°, common-design-md, sdd-cycle°, sdd-gate; prototype (prototype): prototyping-grill, prototyping-preflight, prototyping-loop, prototyping-handoff; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; docs (maintenance): maintain-edit°; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers gate:user; decision points sdd-triage, prototyping-loop; branch points none; binds one flow",
  ],
  [
    "change-compatibility",
    "sdd (sdd): sdd-triage, sdd-contract, sdd-story, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers gate:user, review:heavy; decision points sdd-triage; branch points none; binds one flow",
  ],
  [
    "apply-settled-spec",
    "spec (sdd): sdd-triage(settled), sdd-story, sdd-contract°, sdd-gate; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points sdd-triage; binds one flow",
  ],
  [
    "apply-settled-build",
    "spec (sdd): sdd-triage(settled), sdd-story°, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points sdd-triage; binds one flow",
  ],
  [
    "refactor-code",
    "move (implement): implement-refactor; tests (test_fix): implement-test-fix°; checkpoint (implement): implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-refactor; binds the one flow the proposal names, or none",
  ],
  [
    "edit-text",
    "edit (maintenance): maintain-edit; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "fix-defect",
    "diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; acceptance (acceptance): atdd-scaffold, atdd-credentials°, atdd-author°; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-regression",
    "bisect (diagnose): implement-bisect; diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-bisect, implement-diagnose; binds one flow",
  ],
  [
    "improve-performance",
    "baseline (diagnose): implement-benchmark; profile (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; compare (diagnose): implement-benchmark; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points implement-diagnose; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-vulnerability",
    "intake (triage): triage-security-intake; diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; disclose (verify): verify-advisory; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers gate:user, gate:release, review:heavy; decision points triage-security-intake; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-crash",
    "minimize (diagnose): implement-minimize; diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-intermittent",
    "harness (implement): implement-stress-harness; diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; soak (verify): verify-repeat-run; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-env-bound",
    "collect (triage): triage-request-info; diagnose (diagnose): implement-diagnose; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; confirm (verify): verify-external; default modifiers none; decision points none; branch points implement-diagnose; binds one flow",
  ],
  [
    "fix-conformance",
    "parity (implement): implement-oracle-parity; diagnose (diagnose): implement-diagnose; spec (sdd): sdd-triage, sdd-story, sdd-contract°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points sdd-triage; branch points implement-diagnose; binds one flow",
  ],
  [
    "quarantine-flaky",
    "isolate (implement): implement-quarantine; diagnose (diagnose): implement-diagnose; fix (test_fix): atdd-test-fix°, implement-test-fix°; reenable (verify): verify-repeat-run; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-diagnose; binds the one flow the proposal names, or none",
  ],
  [
    "repair-test",
    "diagnose (diagnose): implement-diagnose; fix (test_fix): atdd-test-fix°, implement-test-fix°; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points none; binds the one flow the proposal names, or none",
  ],
  [
    "fix-red-main",
    "bisect (diagnose): implement-bisect; diagnose (diagnose): implement-diagnose; fix (regression_fix): implement-regression-fix; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points implement-bisect; binds one flow",
  ],
  [
    "change-tooling",
    "diagnose (diagnose): implement-diagnose; edit (implement): implement-tooling; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "bump-dependency",
    "bump (implement): implement-dep-bump; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points none; binds no flow",
  ],
  [
    "revert-culprit",
    "revert (implement): implement-revert; spec (sdd_append): sdd-story°, sdd-gate; implement (implement): implement-tdd, implement-checkpoint; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers none; decision points none; branch points none; binds one flow",
  ],
  [
    "hand-off-operation",
    "inspect (diagnose): implement-diagnose(read-only); handoff (triage): triage-handoff; close (triage): triage-close; default modifiers gate:release; decision points none; release point triage-handoff; branch points none; binds no flow",
  ],
  [
    "backport-fix",
    "pick (implement): implement-backport; verify (verify): verify-change-note°, verify-context, verify-qfai-gate, verify-repo-gate; default modifiers gate:release; decision points none; branch points none; binds no flow",
  ],
  [
    "draft-release-notes",
    "draft (verify): verify-release-notes; default modifiers gate:release; decision points none; branch points none; binds no flow",
  ],
  [
    "verify-manually",
    "check (verify): verify-manual; close (triage): triage-close; default modifiers none; decision points none; branch points none; binds no flow",
  ],
];

function stepText(step: PlanStep): string {
  return `${step.name}${step.mode ? `(${step.mode})` : ""}${step.passThrough ? "°" : ""}`;
}

function listed(names: readonly string[]): string {
  return names.length > 0 ? names.join(", ") : "none";
}

const BINDING = {
  required: "binds one flow",
  optional: "binds the one flow the proposal names, or none",
  none: "binds no flow",
};

// A plan in the words of its catalog example: its stages, its points and the flow it binds.
function described(plan: WorkflowPlanFile, planned: PlanStages): string {
  const stages = plan.stages.map(
    (stage) =>
      `${stage.id} (${stage.kind}${stage.review ? ", no review" : ""}): ${stage.steps.map(stepText).join(", ")}`,
  );
  return [
    ...stages,
    `default modifiers ${listed(plan.defaultModifiers)}`,
    `decision points ${listed(plan.decisionPoints)}`,
    ...(plan.releasePoint ? [`release point ${plan.releasePoint}`] : []),
    `branch points ${listed(plan.branchPoints.map((point) => point.step))}`,
    BINDING[flowBindingOf(planned)],
  ].join("; ");
}

for (const [route, expected] of CATALOG) {
  // QFAI:EX-0001-0218-03
  // QFAI:EX-0001-0220-01
  // QFAI:EX-0001-0220-02
  // QFAI:EX-0001-0220-03
  // QFAI:EX-0001-0220-04
  // QFAI:EX-0001-0220-05
  // QFAI:EX-0001-0220-06
  // QFAI:EX-0001-0220-07
  // QFAI:EX-0001-0220-08
  // QFAI:EX-0001-0220-09
  // QFAI:EX-0001-0220-10
  // QFAI:EX-0001-0220-11
  // QFAI:EX-0001-0220-12
  // QFAI:EX-0001-0220-13
  // QFAI:EX-0001-0220-14
  // QFAI:EX-0001-0220-15
  // QFAI:EX-0001-0220-16
  // QFAI:EX-0001-0220-17
  // QFAI:EX-0001-0220-18
  // QFAI:EX-0001-0220-19
  // QFAI:EX-0001-0220-20
  // QFAI:EX-0001-0220-21
  // QFAI:EX-0001-0220-22
  // QFAI:EX-0001-0220-23
  // QFAI:EX-0001-0220-24
  // QFAI:EX-0001-0220-25
  // QFAI:EX-0001-0220-26
  // QFAI:EX-0001-0220-27
  // QFAI:EX-0001-0220-28
  // QFAI:EX-0001-0220-29
  // QFAI:EX-0001-0220-30
  // QFAI:EX-0001-0220-31
  // QFAI:EX-0001-0220-32
  // QFAI:EX-0001-0220-33
  // QFAI:EX-0001-0220-34
  // QFAI:EX-0001-0220-35
  // QFAI:EX-0001-0220-36
  // QFAI:EX-0001-0220-37
  // QFAI:EX-0001-0220-38
  // QFAI:EX-0001-0220-39
  it(route, async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === route);
    const planned = (await planFacts())[route]?.stages ?? [];

    expect(plan ? described(plan, planned) : undefined).toBe(expected);
  });
}

it("The 39 shipped plans end three ways", async () => {
  const plans = await loadBuiltInPlans();
  const names = (plan: WorkflowPlanFile) =>
    plan.stages.map((stage) => stage.steps.map((step) => step.name));
  const ending = (plan: WorkflowPlanFile) => {
    const stages = names(plan);
    if (stages.flat().includes("verify-repo-gate")) {
      const last = stages.at(-1) ?? [];
      return last.includes("verify-repo-gate") ? "verify" : `verify then ${last.join(",")}`;
    }
    if ((stages.at(-1) ?? []).includes("triage-close")) return "triage-close";
    return stages.map((steps) => steps.join(",")).join(" ▸ ");
  };
  const counts: Record<string, string[]> = {};
  for (const plan of plans) (counts[ending(plan)] ??= []).push(plan.route);

  expect({
    total: plans.length,
    verify: counts.verify?.length,
    external: counts["verify then verify-external"],
    close: counts["triage-close"]?.length,
    releaseNotes: counts["verify-release-notes"],
  }).toEqual({
    total: 39,
    verify: 25,
    external: ["fix-env-bound"],
    close: 12,
    releaseNotes: ["draft-release-notes"],
  });
});
