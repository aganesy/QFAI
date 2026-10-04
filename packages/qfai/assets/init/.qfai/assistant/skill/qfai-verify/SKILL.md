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
    doc-steward,
    implementation-reviewer,
  ]
steps:
  [
    verify-repeat-run,
    verify-advisory,
    verify-change-note,
    verify-context,
    verify-qfai-gate,
    verify-repo-gate,
    verify-external,
    verify-manual,
    verify-release-notes,
  ]
requires: [common-review-cycle]
mode: evidence-focused
---

## /qfai-verify — Quality Gates and Evidence

[DRIFT-PROTOCOL:MANDATORY]

Run the entry check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
first.

## Inputs

- `[--auto]`: ask nothing and record explicit assumptions.
- The scope: `full` by default, or `prototyping` for the prototyping profile
  alone. `verify-context` fixes it.
- The change, and the story tree, contracts, tests and evidence it touches.

The run is reported in the stage report, and its verdict is
`.qfai/report/verify.json`.

## Steps

The steps run in this order. Invoked by name, a step is skipped only when its
condition holds:

| Step                   | What it does                                                     | Skipped when                                    |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `verify-repeat-run`    | Runs the named tests a recorded number of times in a row         | No test is named to show stable                 |
| `verify-advisory`      | Prepares the advisory and disclosure of a vulnerability fix      | The change fixes no vulnerability               |
| `verify-change-note`   | The changelog entry, the migration steps, the breaking changes   | Never; it passes when there is nothing to write |
| `verify-context`       | Reads the inputs, fixes the scope, finds a command for each gate | Never                                           |
| `verify-qfai-gate`     | The QFAI validation of the scope                                 | Never                                           |
| `verify-repo-gate`     | The repository gates, the fix loop, the report, `verify.json`    | Never                                           |
| `verify-external`      | Asks the reporter or a real environment to confirm the fix       | The gates here can confirm the fix              |
| `verify-manual`        | Follows a written test plan on each environment                  | No written test plan is handed in               |
| `verify-release-notes` | Drafts the release notes                                         | Release notes were not asked for                |

Read `.qfai/assistant/step/<step>/STEP.md` for the current step only, run it,
then move to the next. Each step names the common steps it runs in
`requires`; read those when the step reaches them. Every step follows
`.qfai/assistant/rule/shared-skill-operating-baseline.md` and
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`. Questions to the
user follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Inside an `npx qfai workflow` run, the work order lists the steps to run and
this file adds nothing to it.

## Review

A run that wrote no tracked file holds no review: an exit code decides each
gate, and each step's `## Gate` section says what passes it. A run that wrote a
tracked file — a change note, an advisory draft, release notes, or a fix the
fix loop of `verify-repo-gate` made — ends with the code review of what it
wrote, by `implementation-reviewer`.

## Completion

The invocation completes on the gate of the last step that ran. Where
the run wrote a tracked file, every finding of the code review above is fixed
or answered.

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

The completion message lists each decision the agents adopted, with its
reason and any disagreeing position. None of them is put as a question. The
message then ends with a question listing every next action, as
`.agents/rules/user-questions.md` § 6 sets out; under a no-question mode it lists
them in the report instead:

- Proceed (recommended): create a PR on your hosting platform, with the
  verification report as its description.
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
- Verify never rewrites the story tree or a contract; drift fixes belong to `/qfai-sdd` and `/qfai-implement`.
