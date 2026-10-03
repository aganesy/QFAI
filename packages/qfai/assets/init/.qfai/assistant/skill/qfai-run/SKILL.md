---
name: qfai-run
title: QFAI Run (Change request entry)
description: "Use when the user asks for a change, a fix, an investigation of the codebase or a question about the project in plain words and names no stage skill. A question that one command or one file read answers needs no plan. Plans the request with `npx qfai workflow plan` and runs the plan's steps in order to its end."
argument-hint: "<the change, in your own words>"
allowed-tools: [Read, Glob, Grep, Write, Edit, Bash, TodoWrite, Task, Agent]
roles: [orchestrator]
mode: execution-focused
---

## /qfai-run - Change request entry

[DRIFT-PROTOCOL:MANDATORY]

The user states a change once. This skill reads the request into facts, asks
`npx qfai workflow plan` for the plan they give, and runs its steps in order.

- The facts a request is read into: `references/extraction.md`.
- The command, its input and its output: `references/plan.md`.
- What the user sees, and how questions are put: `references/operator-screens.md`.
- Invoke the CLI through the launcher of `.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory`.

## What this skill never does

- Choose a route, which the CLI's decision rules take from the extraction, or
  name one, a stage kind or an internal identifier to the user.
- Put request text on a command line. `plan` reads only the extraction.
- Add, drop or reorder a step the plan names.
- Push, open a pull request, merge, deploy, migrate production or spend
  money without the user's own instruction or a project policy naming it.

## Mode

Read `workflow.mode` in `qfai.config.yaml` first. No key means `active`; any
value but the three below plans nothing.

| Mode     | What this skill does                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| `active` | The work below                                                                       |
| `shadow` | State what the request asks and why. Write nothing, and say that nothing was written |
| `off`    | Plan nothing. The user invokes the stage skills by name                              |

## Request kinds

- A change, a question, a proposal to decide or a report to close is planned.
  A question plans a route that answers it and changes nothing. Text that is
  not a request is not planned.
- Carrying on in a new session: plan the route again with `--route`, and
  start at the first step whose work git and the working tree do not show.
- `stop`: end the work at once and list every open decision as open.
- A request naming a stage skill: invoke that skill by name.

## The work

1. **Extract.** Read the request into an extraction as
   `references/extraction.md` sets out, and pass it to
   `npx qfai workflow plan --in <file>`, or `--in -` on standard input.
2. **Candidates.** When `plan` returns `candidates`, put one single-select
   question, each option saying in the user's words what that route will do,
   then run `npx qfai workflow plan --route <route>` for the chosen one.
3. **Announce.** Before the first stage, give the goal, the stages in order in
   plain words, and the files the work may change. Ask nothing.
4. **Run the stages.** For each stage in order, read the `path` of each step
   and run the step, in order. Write any artifact yourself. Give a part to a
   sub-agent only to run independent parts in parallel, or for a review.
5. **Review.** `review: spec` is done by `requirements-reviewer`, with
   `architecture-reviewer` when a contract changed; `review: code` by
   `implementation-reviewer`. `product-surface-reviewer` joins both where a
   UI contract with screens serves the flow. No agent reviews its own work.
6. **Decision points.** At a step `decisionPoints` names, put each critical
   decision to the user through the structured question tool before changing
   anything that depends on it. A decision is critical when it contradicts a
   specification, a contract or a recorded decision, cannot be taken back, or
   rests on product intent nothing written states. Take every other decision
   yourself, ask nothing, and list it with its reason in the final report.
7. **Release point.** Where `releasePoint` names a step, ask the user to
   approve the release before that step runs; where it is `end`, after the
   last stage. Nothing after it runs without the approval, and the approval
   authorizes no push, merge, tag or publication.
8. **Approvals.** Each approval the user gives, of a specification change, a
   critical decision or a release, is one `decisions.md` row naming what was
   approved, who approved it, when, and the label of the option chosen. A
   decision you took yourself appends no row.
9. **Branch points.** At a step `branchPoints` names, an outcome paired with
   one route moves there; one paired with several moves to the one the step
   names; `decision-table` moves to the route `plan --in` gives the step's new
   extraction. Take the destination's plan with
   `npx qfai workflow plan --route <route>` and continue on it. Any other
   outcome continues the route. Before the third move and every one after it,
   ask the user, naming the destination in plain words; `stop` ends the work.
10. **A finding no stage serves.** Stop, and name the finding, its owner and
    the stage skill to invoke by name.
11. **Report.** As `references/operator-screens.md` sets out.

## Under a no-question mode

Nothing is asked. The first candidate is taken and reported as an assumption.
A critical decision or a release point becomes one `open-questions.md` row,
the step stops before the change that depends on it, and the report lists the
decision as open. A third branch move stops the work.

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

Report one row per part given to a sub-agent.

| Step | Role (sub-agent) | Agent instance  | Task title        | Input (refs)  | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | --------------- | ----------------- | ------------- | ------------- | ---------------------------- |
| 1    | `<role>`         | `<instance id>` | `<part in words>` | The step file | The result    | PASS/REVISE                  |

### Reviewer Gate (MUST)

Each review a plan names returns PASS or REVISE on that stage's work. Under
the Drift Protocol, a step that would change a story, a contract or a decision
the request did not cover stops and says so.

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
  - every decision that is not critical
- ask-user:
  - each critical decision at a decision point, and each release point
  - the candidate question, and a third branch move
- hard-required:
  - change request (the user's own words; an empty request is asked for, never guessed)

## Completion Contract (Shared)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`. **Smallest applicable smoke check** (this skill's override): the gates of the plan's last verify stage. A gate that cannot run is UNRUN, not a pass.

project_memory:

- The user names no stage after the first request.
- The plan is fixed by its route; the session runs every step it names.
