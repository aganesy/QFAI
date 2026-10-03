---
name: qfai-prototyping
title: QFAI Prototyping (DESIGN.md-driven UX Loop)
description: "Use when invoked by name or handed a QFAI work order to settle a visual or interaction decision by prototyping UI contracts under the root DESIGN.md."
argument-hint: ""
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    product-experience-architect,
    completion-reviewer,
    devops-ci-engineer,
    product-surface-reviewer,
  ]
steps:
  [
    prototyping-grill,
    prototyping-preflight,
    prototyping-loop,
    prototyping-recover,
    prototyping-handoff,
  ]
requires: [common-review-cycle]
mode: execution-focused
---

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

Run the entry check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
first.

The loop is static-first and file-based by default. Supported surfaces: web,
mobile, desktop, mixed. cli surface is rejected. Only UI contracts declaring a
full `UI-NNNN` ID and a non-empty `screens[]` enter the prototyping scope;
`prototyping-grill` § Scope says which of them one invocation covers. The
primary contract comes from `qfai.config.yaml#prototyping.primaryUiContract`
or `--primary-ui-contract <UI-NNNN>`.

## Inputs Priority

When unsure, read inputs in this order:

- P1: `.qfai/assistant/rule/*`, and `.qfai/assistant/skill/qfai-grilling/SKILL.md` before either session — the one before the loop and the one the acceptance session resumes
- P2: `.qfai/assistant/rule/agent-selection.md`, the routed cards under `.qfai/assistant/agent/`, and project context in the story tree
- P3: root `DESIGN.md` — the brand identity; the loop records its hash at cycle 0 and refuses a later cycle against a changed file
- P4: the UI contracts under `<contractsDir>/ui/**/*.{yaml,yml}` and the references each step lists
- P5: evidence from earlier cycles under `.qfai/evidence/prototyping/`

## Steps

| Step                    | Runs                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `prototyping-grill`     | Always, first: fixes the scope and settles by talking what the prototype is for           |
| `prototyping-preflight` | Always: checks the UI contracts, root `DESIGN.md` and the Playwright environment          |
| `prototyping-loop`      | Always: the C0..C9 generate, review and transcribe loop, then the user acceptance session |
| `prototyping-recover`   | On demand only, when the loop calls for it                                                |
| `prototyping-handoff`   | Only after the loop ends with the prototype accepted: handoff, validate, verify, certify  |

`prototyping-recover` is skipped unless a loop exit (`65`, `66` or `2`), a
retired UI contract, or a request to continue a sealed loop calls for it. When
one does, run it, then return to `prototyping-loop`.

A step's gate that ends the run ends the invocation: zero UI-bearing contracts
at preflight, an escalated decision before C0, or a stop, a declined reset or a
no-question mode at the acceptance session.

Read `.qfai/assistant/step/<step>/STEP.md` for the current step only, run it,
then move to the next.

Inside an `npx qfai workflow` run, the work order lists the steps to run and
this file adds nothing to it.
Select roles by `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

Questions to the user follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
This skill's own are the choice at the acceptance session, the cycle-0 reset,
which side wins when `DESIGN.md` drifts from the hash cycle 0 recorded, and a
missing brand intent.

### Reviewer Gate

After the last step, run one review through `common-review-cycle`, with the
union of the reviewers of the steps that ran. The reviewers judge the rendered
screenshot and HTML of each iteration, never the code alone. Their findings are
signals, not gates, unless certify, validate or verify fails.

## Completion

The invocation completes on the gate of `prototyping-handoff` and a PASS of the
review above: `npx qfai prototyping certify --check` returns 0 and
`/qfai-verify` returns PASS. Report every decision a session adopted, as that
step says. The report ends with a question listing the actions under Next, as
`.agents/rules/user-questions.md` § 6 sets out.
Under a no-question mode, list them in the report instead.

## Next

- `/qfai-implement` / `/qfai-verify`

## Default Autopilot Policy

- ask-user:
  - the choice a finished prototype was built to make answerable, asked again
    against it — this skill's own operation, because it is what the loop was
    run to produce
  - the cycle-0 reset a rejected choice needs, which deletes `iter-01` upward —
    a destructive operation, and one the design answer does not consent to

project_memory:

- The loop runs at most 10 cycles, and the count spans cycle-0 resets.
- Cycle 0 records the sha256 of `DESIGN.md` in `prototyping.json#designMd`; a mismatch at any later cycle exits 2 and stops the loop.
- `prototyping.json#iterations[]` transcribes the reviewer's `iter-NN/review.json`; on a disagreement the reviewer's file wins.
