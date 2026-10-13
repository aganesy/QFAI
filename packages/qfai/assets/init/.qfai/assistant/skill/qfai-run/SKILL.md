---
name: qfai-run
title: QFAI Run (Change request entry)
description: "Use when the user asks for a change, a fix, an investigation of the codebase, a question about the project or an operation on finished work in plain words and names no stage skill. Plans every such request, the lightest included, with `npx qfai workflow plan` and runs the plan's steps in order to its end."
argument-hint: "<the change, in your own words>"
allowed-tools: [Read, Glob, Grep, Write, Edit, Bash, TodoWrite, Task, Agent]
roles: [orchestrator]
steps: []
requires: [common-policy-check, common-review-cycle]
mode: execution-focused
---

## /qfai-run - Change request entry

[DRIFT-PROTOCOL:REQUIRED]

Follow the CLI plan's steps in order.

- Read `references/extraction.md` for extraction.
- Plan command and format: `references/plan.md`.
- Screens and questions: `references/operator-screens.md`.
- Release, decision and branch points: `references/stage-points.md`.
- Run preflight before planning, as `.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory` says.
  If the launcher is missing or preflight fails, read `references/operator-screens.md` for recovery.
- Read `references/codex-cloud-install.md` before configuring an environment-owned Install script or Start skill, or preparing dependencies for a fresh checkout. Use the reviewed target's successful preparation and canonical proof before planning.

## What this skill never does

- Choose a route, which the CLI's decision rules take from the extraction, or
  name one, a stage kind or an internal identifier to the user.
- Put request text on a command line. `plan` reads only the extraction.
- Add, drop or reorder a step the plan names, or run a stage outside the scope.
- Push, open a pull request, merge, deploy, migrate production or spend
  money without the user's own instruction or a project policy naming it.

## Mode

Read `workflow.mode` in `qfai.config.yaml` first. No key means `active`; unlisted
values plan nothing.

| Mode     | What this skill does                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `active` | The work below                                                                       |
| `shadow` | State what the request asks and why. Write nothing, and say that nothing was written |
| `off`    | Plan nothing. The user invokes the stage skills by name                              |

## Request kinds

- For independent targets under one goal, read `references/operator-screens.md`
  before planning or switching during a wait.
- Plan changes, questions, proposals to decide and reports to close.
  Questions plan answers without changes; nonrequests get no plan.
- Replies with a requested answer or result, including failure, resume the same step without
  a new invocation. An independent new request is planned; read `references/operator-screens.md`
  for replies.
- `stop`: end the work at once and list every open decision as open.
- A request naming a stage skill: invoke that skill by name.

## The work

1. **Extract.** A question one read answers is `{ intent: question-why, qualifiers: [session-answerable] }`
   (or `question-how`, `question-help`), and an operation on finished work `{ intent: order, artifacts: [] }`;
   neither needs a reference. Read any other request as `references/extraction.md` sets out, and pass
   the extraction to `npx qfai workflow plan --in <file>`, or `--in -` on standard input.
2. **Candidates.** When `plan` returns `candidates`, put one single-select
   question, each option saying in the user's words what that route will do,
   then run `npx qfai workflow plan --route <route>` for the chosen one.
3. **Scope.** With two or more scopes, ask which to run as `references/operator-screens.md` says,
   and run only its stages. With one scope, no scopes, or a branch destination's plan, ask
   nothing and run every stage.
4. **Announce.** Before the first stage, give the goal, the chosen stages in order in plain words,
   and the files the work may change. Ask nothing. Then run `common-policy-check` once, unless the
   plan's one step is `triage-answer` or `triage-operate`. On a route that changes no file, one that
   closes, answers or asks, it reads and reports and writes nothing.
5. **Run the stages.** Run each stage in plan order, and each of its steps in
   order, as `.qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory` says.
   When a step is short or passes without edits, read `references/operator-screens.md`.
   Write artifacts yourself or delegate independent parallel work or review.
   At each step, follow its plan's points in `references/stage-points.md`:
   - **Release point.** Ask the user to approve the release before the step `releasePoint` names.
   - **Decision point.** Put each critical decision at a step `decisionPoints` names to the user.
   - **Branch point.** Move to the destination a step `branchPoints` names, and plan it at once.
6. **Review.** After a stage whose `review` is `spec`, `requirements-reviewer` reviews; for `code`,
   `implementation-reviewer`. Only a contract or screen change no earlier review read adds
   `architecture-reviewer` or `product-surface-reviewer`, as `common-review-cycle` lists; no one else
   joins. A merge or branch update whose only edits resolve conflicts between reviewed sides gets no reviewer.
   No agent reviews its own work; no step adds a review. Each returns PASS or REVISE.
   Fix or answer each finding once, with no re-review. Stop a step that exceeds the request.
7. **Approvals.** Each approval of a specification change, a critical decision
   or a release is one `decisions.md` row: what was approved, who approved it,
   when, and the chosen option's label. A decision you took appends no row.
8. **A finding no stage serves.** Stop, and name the finding, its owner and the stage skill to invoke by name.
9. **Commit.** `verify-commit` runs last, after any release point; never pushes.

## Under a no-question mode

Nothing is asked. The plan's narrowest scope, or the first candidate and its narrowest scope, is taken and reported as an assumption.
An uncovered question-only move to tracked-file repair instead stops that target
with a report and no tracked open question, as `references/stage-points.md` says.
A critical decision or a release point becomes one `open-questions.md` row,
the step stops before the change that depends on it, and the report lists the
decision as open. A third branch move, or one from a scope that leaves stages out, stops the work.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Inputs Priority

- P1: `.qfai/assistant/rule/*`
- P2: the plan `npx qfai workflow plan` returns
- P3: the story tree under `<paths.specsDir>` and the contracts under `<paths.contractsDir>`
- P4: the user's request

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

## Work Orders Summary

When parts ran in parallel, use the summary in `references/operator-screens.md`.

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
- ask-user:
  - each critical decision at a decision point, and each release point
  - the candidate question, the scope question, a third branch move, and any branch move from a narrower scope
- hard-required:
  - change request (the user's own words; an empty request is asked for, never guessed)

## Completion Contract (Shared)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check**: the chosen scope's `verify-qfai-gate` and `verify-repo-gate` gates. With none, run no gate and report it. Unavailable gates are UNRUN, never PASS.

At stage boundaries, follow `references/reached-step-observations.md` in the existing report.

If requested evidence handover must precede archive, read `references/evidence-delivery.md`
and complete receiving proof first. Missing access leaves handover pending and originals
retained; ordinary completion requires no unsolicited upload.

project_memory:

- The user names no stage after the first request.
- The plan is fixed by its route; the session runs every step of the chosen scope.
