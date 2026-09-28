---
name: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Use when invoked by name or handed a QFAI work order to write or repair the acceptance tests of one business flow."
argument-hint: "<BF-ID> [--auto]"
allowed-tools: [Read, Glob, Write, Edit, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    test-design-analyst,
    qa-strategist,
    acceptance-test-engineer,
    devops-ci-engineer,
    completion-reviewer,
    delivery-planner,
    qa-gatekeeper,
    implementation-reviewer,
  ]
steps: [atdd-scaffold, atdd-credentials, atdd-author, atdd-test-fix]
mode: execution-focused
---

## /qfai-atdd — Author acceptance tests

[DRIFT-PROTOCOL:MANDATORY]

The active scope is one `BF-NNNN` business flow. Its evidence file is
`.qfai/evidence/atdd-BF-NNNN.md`. Send a decision, a question for the user or
an out-of-scope discovery to `/qfai-sdd` as a change request, under
`.qfai/assistant/rule/drift-protocol.md`.

## Steps

Run the steps as
`.qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory`
sets out, reading `.qfai/assistant/step/<step>/STEP.md` for the current step
only.

| Step               | Runs                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `atdd-scaffold`    | First, unless the invocation repairs a test                              |
| `atdd-credentials` | Only when a test in scope needs an authenticated actor                   |
| `atdd-author`      | After the two above: writes the tests and observes each RED              |
| `atdd-test-fix`    | Instead of the three above, when the invocation repairs a defective test |

`atdd-test-fix` runs when a diagnosis names a defective E2E, integration or
API test: the first matched ID is a BF or an AC. An invocation that authors
tests skips it.

Before dispatching a step's agents, resolve its routing as
`.qfai/assistant/skill/qfai-atdd/references/stale-manifest.md` says. Roles are
selected under `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.
Questions to the user follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

### Reviewer Gate

The one review after the last step checks what the `Review` section of each
step that ran names. The test author cannot sign off their own work.
The Drift Protocol, `.qfai/assistant/rule/test-layers.md`, and the rule that
test volume and planning estimates are signals, not gates, apply as
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#reviewer-gate-baseline`
states.

## Completion

The invocation completes on the gate of its last step and a PASS of that
review. Report what that gate names. The report ends with a question listing the
next actions, `/qfai-implement` recommended, as
`.agents/rules/user-questions.md` § 6 sets out.

## Default Autopilot Policy

- auto-decide: test selectors, fixture organization, and output formatting
  within the active BF and its declared contracts.
- ask-user: approval-required operations, scope expansion, and product
  decisions not settled by the story tree. In `--auto`, report these as
  pending instead of supplying an answer.
- hard-required:

project_memory:

- BF maps to E2E; AC maps to integration or API; EX tests belong to implement.
- Placeholders and unasserted annotations discharge no obligation.
