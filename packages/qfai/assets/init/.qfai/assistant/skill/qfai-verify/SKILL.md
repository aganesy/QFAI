---
name: qfai-verify
title: QFAI Verify (Quality Gates + Evidence)
description: "Use when invoked by name or handed a QFAI work order to verify a change before it is handed off."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Bash, Write, Edit, TodoWrite, Task, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    qa-strategist,
    devops-ci-engineer,
    qa-gatekeeper,
    completion-reviewer,
    implementation-reviewer,
  ]
steps: [verify-context, verify-qfai-gate, verify-repo-gate]
requires: [common-review-cycle]
mode: evidence-focused
---

## /qfai-verify — Quality Gates and Evidence

[DRIFT-PROTOCOL:MANDATORY]

## Inputs

- `[--auto]`: ask nothing and record explicit assumptions.
- The scope: `full` by default, or `prototyping` for the gate that runs before
  `npx qfai prototyping certify`. `verify-context` fixes it.
- The change, and the story tree, contracts, tests and evidence it touches.

The run's evidence is `.qfai/evidence/verify-<run-id>.md`, and its verdict is
`.qfai/report/verify.json`.

## Steps

Every step runs, in this order:

| Step               | Runs                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `verify-context`   | First: reads the inputs, fixes the scope, finds a command for each gate  |
| `verify-qfai-gate` | Second: the QFAI validation of the scope                                 |
| `verify-repo-gate` | Last: the repository gates, the fix loop, the evidence and `verify.json` |

Read `.qfai/assistant/step/<step>/STEP.md` for the current step only, run it,
then move to the next. Each step names the common steps it runs in
`requires`; read those when the step reaches them. Every step follows
`.qfai/assistant/rule/shared-skill-operating-baseline.md` and
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`. Questions to the
user follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Inside an `npx qfai workflow` run, the work order lists the steps to run and
this file adds nothing to it. The entry check is
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.

## Review

After the last step, run one review through `common-review-cycle`, with the
union of the reviewers of the steps that ran: `qa-gatekeeper` and
`completion-reviewer`, and `implementation-reviewer` when the fix loop changed
code. Each step's `## Gate` section says what its reviewers check.

- Gate execution (`devops-ci-engineer`) and completion approval
  (`completion-reviewer`) are separate agents. Completion is approved by a
  reviewer who did not run the gates.
- `qa-gatekeeper` confirms gate coverage before approval.
- Do not hand off until all routed blocking reviewers return `PASS`.

## Completion

The invocation completes on the gate of `verify-repo-gate` and a PASS of the
review above.

When declaring DONE, include:

- the referenced inputs: instructions, project policy and contracts,
  `decisions.md`, and the applicable stories;
- the decision IDs referenced, or "none" when no decision applies;
- confirmation that no rejected option was reintroduced;
- any gap left open, stated rather than hidden.

Open questions that place a **new obligation on the product** are routed to
the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per
`.qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations`.
Questions about this skill's own inputs or settings stay in its own output for
the user to answer. This skill does not write `open-questions.md`.

The completion message lists each adopted decision — every
`grilling(<Session>@<run key>/agents)` row — with its reason and any
disagreeing position. None of them is put as a question. The message then
ends with a question listing every next action, as
`.agents/rules/user-questions.md` § 6 sets out; under a no-question mode it lists
them in the report instead:

- Proceed (recommended): create a PR on your hosting platform, with the
  verification evidence summary as its description.
- A `prototyping` scope that passed: run `npx qfai prototyping certify`.
- A gate failed: return to the owning skill, fix the issue, then rerun
  `/qfai-verify`.
- A report is needed: run `npx qfai report` once the validation outputs are
  current.

## Default Autopilot Policy

- hard-required:
  - brand intent when a prototyping-scoped run consumes an unresolved visual design decision
  - a full `UI-NNNN` when a prototyping-scoped run cannot resolve its primary UI contract from the invocation or current evidence
  - a usable story source when a flow-scoped run cannot resolve it from the configured story tree or invocation
  - an affected `BF-NNNN` when a flow-scoped run cannot resolve it from the configured story tree or invocation

project_memory:

- Verify is the full-scan approval gate; the validate runs of the other stages are signals, and the verify gate is the binding pass.
- Verify never rewrites the story tree or a contract; drift fixes belong to `/qfai-sdd`, `/qfai-atdd` and `/qfai-implement`.
