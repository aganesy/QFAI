// QFAI:AC-0001-0220-01
// QFAI:AC-0001-0220-02
// QFAI:AC-0001-0220-03
// QFAI:AC-0001-0220-04
// QFAI:AC-0001-0220-05
// QFAI:AC-0001-0220-06
// QFAI:AC-0001-0220-07
// QFAI:AC-0001-0218-03
// QFAI:EX-0001-0218-03

import { expect, it } from "vitest";

import {
  loadBuiltInPlans,
  type PlanStep,
  type WorkflowPlanFile,
} from "../../../src/core/workflow/plans.js";

// Each shipped plan, as its catalog example states it.
const CATALOG: [string, string][] = [
  [
    "close-no-change",
    "Stages in order — `close` (triage): `triage-close`; decision points none; release point none; branch points none",
  ],
  [
    "answer-question",
    "Stages in order — `answer` (triage): `triage-investigate°`, `triage-answer`, `triage-close`; decision points none; release point none; branch points `triage-investigate`, `defect-found` to the route the decision rules give",
  ],
  [
    "request-info",
    "Stages in order — `ask` (triage): `triage-request-info`; `close` (triage): `triage-close`; decision points none; release point none; branch points `triage-close`, `info-received` to the route the decision rules give",
  ],
  [
    "close-duplicate",
    "Stages in order — `dedupe` (triage): `triage-dedupe`; `close` (triage): `triage-close`; decision points none; release point none; branch points none",
  ],
  [
    "cluster-reports",
    "Stages in order — `cluster` (triage): `triage-cluster`; `close` (triage): `triage-close`; decision points none; release point none; branch points none",
  ],
  [
    "decide-design",
    "Stages in order — `discussion` (discussion): `discussion-research`, `discussion-interview`, `discussion-pack°`, `discussion-uiux°`, `discussion-oq`; `close` (triage): `triage-close`; decision points `discussion-interview`; release point none; branch points `triage-close`, `adopted` to `add-feature`, `prototype-feature` or `change-compatibility`",
  ],
  [
    "decompose-epic",
    "Stages in order — `discussion` (discussion): `discussion-research`, `discussion-interview`, `discussion-pack`, `discussion-oq`; `split` (triage): `triage-decompose`; `close` (triage): `triage-close`; decision points `discussion-interview`, `triage-decompose`; release point none; branch points none",
  ],
  [
    "retriage-bundle",
    "Stages in order — `recheck` (diagnose): `implement-diagnose(read-only)`; `split` (triage): `triage-decompose`; `close` (triage): `triage-close`; decision points none; release point none; branch points none",
  ],
  [
    "repair-consistency",
    "Stages in order — `diagnose` (diagnose): `implement-diagnose`; `sdd` (sdd, then the specification review): `sdd-triage`, `sdd-flow°`, `sdd-story°`, `sdd-contract°`, `sdd-cycle°`; `implement` (implement): `implement-scaffold`, `implement-tdd`, `implement-sweep°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`, `implement-sweep`; release point none; branch points `sdd-triage`, `retire` to `retire-mechanism`",
  ],
  [
    "retire-mechanism",
    "Stages in order — `diagnose` (diagnose): `implement-diagnose`; `decide` (sdd): `sdd-triage`; `remove` (implement): `implement-retire`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`; release point none; branch points none",
  ],
  [
    "restate-records",
    "Stages in order — `diagnose` (diagnose): `implement-diagnose`; `spec` (sdd, then the specification review): `sdd-triage`, `sdd-story`, `sdd-contract°`; `tests` (test_fix): `implement-test-fix°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`; release point none; branch points none",
  ],
  // QFAI:EX-0001-0220-15
  [
    "add-feature",
    "Stages in order — `sdd` (sdd, then the specification review): `sdd-triage`, `sdd-flow°`, `sdd-story`, `sdd-contract°`, `common-design-md°`, `sdd-cycle°`; `implement` (implement): `implement-scaffold`, `implement-tdd`; `docs` (maintenance): `maintain-edit°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`; release point none; branch points none",
  ],
  // QFAI:EX-0001-0220-16
  [
    "prototype-feature",
    "Stages in order — `sdd` (sdd, then the specification review): `sdd-triage`, `sdd-flow°`, `sdd-story`, `sdd-contract°`, `common-design-md`, `sdd-cycle°`; `prototype` (prototype): `prototyping-grill`, `prototyping-preflight`, `prototyping-loop`, `prototyping-handoff`; `implement` (implement): `implement-scaffold`, `implement-tdd`; `docs` (maintenance): `maintain-edit°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`, `prototyping-loop`; release point none; branch points none",
  ],
  [
    "change-compatibility",
    "Stages in order — `sdd` (sdd, then the specification review): `sdd-triage`, `sdd-contract`, `sdd-story`; `implement` (implement): `implement-scaffold`, `implement-tdd`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`; release point none; branch points none",
  ],
  [
    "refactor-code",
    "Stages in order — `move` (implement): `implement-refactor`; `tests` (test_fix): `implement-test-fix°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-refactor`, `behaviour-change` to `add-feature` or `change-compatibility`",
  ],
  [
    "edit-text",
    "Stages in order — `edit` (maintenance): `maintain-edit`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points none",
  ],
  // QFAI:EX-0001-0220-22
  [
    "fix-defect",
    "Stages in order — `diagnose` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-diagnose`",
  ],
  [
    "improve-performance",
    "Stages in order — `baseline` (diagnose): `implement-benchmark`; `profile` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `compare` (diagnose): `implement-benchmark`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `implement-diagnose`; release point none; branch points `implement-diagnose`",
  ],
  [
    "fix-vulnerability",
    "Stages in order — `intake` (triage): `triage-security-intake`; `diagnose` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `disclose` (verify): `verify-advisory`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `triage-security-intake`; release point the end; branch points `implement-diagnose`",
  ],
  [
    "fix-intermittent",
    "Stages in order — `harness` (implement): `implement-stress-harness`; `diagnose` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `soak` (verify): `verify-repeat-run`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-diagnose`",
  ],
  [
    "fix-env-bound",
    "Stages in order — `collect` (triage): `triage-request-info`; `diagnose` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; `confirm` (verify): `verify-external`; decision points none; release point none; branch points `implement-diagnose`",
  ],
  [
    "fix-conformance",
    "Stages in order — `parity` (implement): `implement-oracle-parity`; `diagnose` (diagnose): `implement-diagnose`; `implement` (implement): `implement-tdd`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-diagnose`",
  ],
  [
    "quarantine-flaky",
    "Stages in order — `isolate` (implement): `implement-quarantine`; `diagnose` (diagnose): `implement-diagnose`; `fix` (test_fix): `implement-test-fix°`; `reenable` (verify): `verify-repeat-run`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-diagnose`, `product-race` to `fix-intermittent`",
  ],
  [
    "repair-test",
    "Stages in order — `diagnose` (diagnose): `implement-diagnose`; `fix` (test_fix): `implement-test-fix`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points none",
  ],
  [
    "fix-red-main",
    "Stages in order — `bisect` (diagnose): `implement-bisect`; `diagnose` (diagnose): `implement-diagnose`; `fix` (regression_fix): `implement-regression-fix`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points `implement-bisect`, `revert` to `revert-culprit`",
  ],
  [
    "change-tooling",
    "Stages in order — `edit` (implement): `implement-tooling`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points none",
  ],
  [
    "bump-dependency",
    "Stages in order — `bump` (implement): `implement-dep-bump`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points none",
  ],
  [
    "revert-culprit",
    "Stages in order — `revert` (implement): `implement-revert`; `implement` (implement): `implement-tdd`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point none; branch points none",
  ],
  [
    "hand-off-operation",
    "Stages in order — `inspect` (diagnose): `implement-diagnose(read-only)`; `handoff` (triage): `triage-handoff`; `close` (triage): `triage-close`; decision points none; release point `triage-handoff`; branch points none",
  ],
  [
    "backport-fix",
    "Stages in order — `pick` (implement): `implement-backport`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points none; release point the end; branch points none",
  ],
  [
    "draft-release-notes",
    "Stages in order — `draft` (verify): `verify-release-notes`; decision points none; release point the end; branch points none",
  ],
  [
    "verify-manually",
    "Stages in order — `check` (verify): `verify-manual`; `close` (triage): `triage-close`; decision points none; release point none; branch points none",
  ],
  [
    "apply-settled",
    "Stages in order — `spec` (sdd, then the specification review): `sdd-triage(settled)`, `sdd-story°`, `sdd-contract°`; `implement` (implement): `implement-scaffold°`, `implement-tdd°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`; release point none; branch points `sdd-triage`, `outside-record` to `decide-design`",
  ],
  [
    "apply-settled-prototype",
    "Stages in order — `spec` (sdd, then the specification review): `sdd-triage(settled)`, `sdd-story°`, `sdd-contract°`, `common-design-md`; `prototype` (prototype): `prototyping-grill`, `prototyping-preflight`, `prototyping-loop`, `prototyping-handoff`; `implement` (implement): `implement-scaffold°`, `implement-tdd°`; `note` (verify, then the code review): `verify-change-note°`; `verify` (verify): `verify-qfai-gate`, `verify-repo-gate`, `verify-commit`; decision points `sdd-triage`, `prototyping-loop`; release point none; branch points `sdd-triage`, `outside-record` to `decide-design`",
  ],
];

const REVIEW = { spec: ", then the specification review", code: ", then the code review" };

function stepText(step: PlanStep): string {
  return `\`${step.name}${step.mode ? `(${step.mode})` : ""}${step.passThrough ? "°" : ""}\``;
}

function ticked(names: readonly string[]): string {
  return names.length > 0 ? names.map((name) => `\`${name}\``).join(", ") : "none";
}

// `a`, `a` or `b`, and `a`, `b` or `c`.
function either(routes: readonly string[]): string {
  const named = routes.map((route) => `\`${route}\``);
  const last = named.pop() ?? "";
  return named.length > 0 ? `${named.join(", ")} or ${last}` : last;
}

// A branch point as an example states it. The outcomes of `implement-diagnose` in a route of
// the `fix` family are the family's, and the example names only the step.
function branchText(plan: WorkflowPlanFile, point: WorkflowPlanFile["branchPoints"][number]) {
  if (plan.family === "fix" && point.step === "implement-diagnose") return `\`${point.step}\``;
  const outcomes = point.outcomes.map(
    ({ outcome, routes }) =>
      `\`${outcome}\` to ${routes === "decision-table" ? "the route the decision rules give" : either(routes)}`,
  );
  return [`\`${point.step}\``, ...outcomes].join(", ");
}

// A plan in the words of its catalog example.
function described(plan: WorkflowPlanFile): string {
  const stages = plan.stages.map(
    (stage) =>
      `\`${stage.id}\` (${stage.kind}${stage.review ? REVIEW[stage.review] : ""}): ${stage.steps.map(stepText).join(", ")}`,
  );
  const release = plan.releasePoint;
  const branches = plan.branchPoints.map((point) => branchText(plan, point));
  return [
    `Stages in order — ${stages.join("; ")}`,
    `decision points ${ticked(plan.decisionPoints)}`,
    `release point ${release === undefined ? "none" : release === "end" ? "the end" : `\`${release}\``}`,
    `branch points ${branches.length > 0 ? branches.join("; ") : "none"}`,
  ].join("; ");
}

for (const [route, expected] of CATALOG) {
  // QFAI:EX-0001-0220-01
  // QFAI:EX-0001-0220-02
  // QFAI:EX-0001-0220-04
  // QFAI:EX-0001-0220-05
  // QFAI:EX-0001-0220-06
  // QFAI:EX-0001-0220-08
  // QFAI:EX-0001-0220-09
  // QFAI:EX-0001-0220-10
  // QFAI:EX-0001-0220-11
  // QFAI:EX-0001-0220-13
  // QFAI:EX-0001-0220-14
  // QFAI:EX-0001-0220-17
  // QFAI:EX-0001-0220-20
  // QFAI:EX-0001-0220-21
  // QFAI:EX-0001-0220-24
  // QFAI:EX-0001-0220-25
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
  // QFAI:EX-0001-0220-41
  // QFAI:EX-0001-0220-42
  it(route, async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === route);

    expect(plan ? described(plan) : undefined).toBe(expected);
  });
}

it("The 35 shipped plans end three ways", async () => {
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
    total: 35,
    verify: 23,
    external: ["fix-env-bound"],
    close: 10,
    releaseNotes: ["draft-release-notes"],
  });
});
