---
name: qfai-implement
title: QFAI Implement (TDD micro-cycle)
description: "Use when invoked by name or handed a QFAI work order to implement, diagnose or repair the examples of one business flow."
argument-hint: "<BF-ID> [EX-ID...]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    test-design-analyst,
    qa-strategist,
    frontend-engineer,
    backend-engineer,
    devops-ci-engineer,
    implementation-reviewer,
    qa-gatekeeper,
    completion-reviewer,
    product-surface-reviewer,
    doc-steward,
  ]
steps:
  - implement-tdd
  - implement-checkpoint
  - implement-diagnose
  - implement-regression-fix
  - implement-test-fix
  - implement-seam
  - implement-bisect
  - implement-revert
  - implement-minimize
  - implement-stress-harness
  - implement-oracle-parity
  - implement-benchmark
  - implement-refactor
  - implement-retire
  - implement-sweep
  - implement-quarantine
  - implement-dep-bump
  - implement-tooling
  - implement-backport
requires: [common-review-cycle]
mode: approval-gated
---

## /qfai-implement — Implement a business flow

[DRIFT-PROTOCOL:MANDATORY]

Run the entry check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
first.

## Inputs

- `<BF-ID>`: the business flow, `BF-NNNN`.
- `[EX-ID...]`: optional examples of that flow, worked in the order given.
- The flow's stories, acceptance criteria, examples and contracts, from the
  configured `paths.specsDir` and `paths.contractsDir`.
- For UI work, root `DESIGN.md` and the flow's UI contracts. The rendered
  surface is reviewed, not only the source.

Every step follows `.qfai/assistant/rule/shared-skill-operating-baseline.md`,
`.qfai/assistant/rule/shared-skill-delegation-baseline.md` and
`.qfai/assistant/rule/test-layers.md`. Every question to the user follows
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Steps

`<BF-ID> [EX-ID...]` runs two steps, in this order:

| Step                   | File                                                | Runs                                            |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------- |
| `implement-tdd`        | `.qfai/assistant/step/implement-tdd/STEP.md`        | First: every owed example, Red, Green, Refactor |
| `implement-checkpoint` | `.qfai/assistant/step/implement-checkpoint/STEP.md` | Last: the flow checkpoint and completion gate   |

Each of these runs alone, instead of that order, when the request is not new
behaviour but a failure, a repair or upkeep:

| Step                       | File                                                    | Runs instead, when                                                        |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `implement-diagnose`       | `.qfai/assistant/step/implement-diagnose/STEP.md`       | A failure is reported and its cause is not yet known                      |
| `implement-regression-fix` | `.qfai/assistant/step/implement-regression-fix/STEP.md` | A diagnosis found a regression that a correct existing test catches       |
| `implement-test-fix`       | `.qfai/assistant/step/implement-test-fix/STEP.md`       | A diagnosis found a defective test whose first matched ID is an EX        |
| `implement-seam`           | `.qfai/assistant/step/implement-seam/STEP.md`           | An acceptance result asks for a seam before its RED can be taken          |
| `implement-bisect`         | `.qfai/assistant/step/implement-bisect/STEP.md`         | A behaviour that worked at an earlier revision fails now                  |
| `implement-revert`         | `.qfai/assistant/step/implement-revert/STEP.md`         | A bisection named a culprit that can be undone whole                      |
| `implement-minimize`       | `.qfai/assistant/step/implement-minimize/STEP.md`       | A crash came with a large input that causes it                            |
| `implement-stress-harness` | `.qfai/assistant/step/implement-stress-harness/STEP.md` | A failure comes and goes and nothing reproduces it on demand              |
| `implement-oracle-parity`  | `.qfai/assistant/step/implement-oracle-parity/STEP.md`  | The expected behaviour is set by a standard or a reference implementation |
| `implement-benchmark`      | `.qfai/assistant/step/implement-benchmark/STEP.md`      | A path is slow: once before the change, once after it                     |
| `implement-refactor`       | `.qfai/assistant/step/implement-refactor/STEP.md`       | The code is to be rearranged with no change in behaviour                  |
| `implement-retire`         | `.qfai/assistant/step/implement-retire/STEP.md`         | A recorded decision retires a mechanism                                   |
| `implement-sweep`          | `.qfai/assistant/step/implement-sweep/STEP.md`          | A widened check has to be run over the whole tree                         |
| `implement-quarantine`     | `.qfai/assistant/step/implement-quarantine/STEP.md`     | A named test passes and fails on the same code                            |
| `implement-dep-bump`       | `.qfai/assistant/step/implement-dep-bump/STEP.md`       | A dependency is to be raised to a new version                             |
| `implement-tooling`        | `.qfai/assistant/step/implement-tooling/STEP.md`        | A workflow, a script or a development tool is to change                   |
| `implement-backport`       | `.qfai/assistant/step/implement-backport/STEP.md`       | A merged change is to be carried to a release branch                      |

Read the `STEP.md` of the current step only, run it, then move to the next.
Each step names the common steps it runs in `requires`; read those when the
step reaches them.

Inside an `npx qfai workflow` run, the work order lists the steps to run and
this file adds nothing to it.

### Reviewer Gate

After the last step, run one review through `common-review-cycle` with the
union of the reviewers of the steps that ran.

## Completion

The invocation completes on the gate of its last step and a PASS of the review
above. For `<BF-ID>`, that is the completion gate of `implement-checkpoint`.
The report ends with a question listing the next actions, `/qfai-verify`
recommended, as `.agents/rules/user-questions.md` § 6 sets out.
Under a no-question mode, list them in the report instead.

## Default Autopilot Policy

- auto-decide: implementation seam, test selector, and local refactor that
  preserve the active story and contract behavior.
- ask-user: critical product choices.

The BF, EX, and contract sources come from the invocation and configured tree.
If they cannot be resolved, stop at preflight and report the missing source.

project_memory:

- Select EX work from a fresh flow-scoped validator result, one EX at a time.
- Keep BF E2E and AC integration or API obligations with `/qfai-atdd`.
