---
name: qfai-triage
title: QFAI Triage (Requests that end without a change)
description: "Use when invoked by name or handed a QFAI work order for a request that ends without a change to the project: a question to answer, a duplicate, missing information, a request to split, automated reports, a security report to take in, or an operation only a person can run."
argument-hint: "<the request, as it was reported>"
allowed-tools: [Read, Glob, Grep, Write, Bash, TodoWrite, Task, Agent]
roles:
  [
    orchestrator,
    discovery-analyst,
    requirements-analyst,
    delivery-planner,
    solution-architect,
    frontend-engineer,
    backend-engineer,
    devops-ci-engineer,
  ]
steps:
  - triage-dedupe
  - triage-request-info
  - triage-investigate
  - triage-answer
  - triage-decompose
  - triage-cluster
  - triage-security-intake
  - triage-handoff
  - triage-close
requires: []
mode: execution-focused
---

## /qfai-triage - Requests that end without a change

[DRIFT-PROTOCOL:MANDATORY]

Run the entry check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
first.

This skill answers, closes, splits or hands over a request, and changes no
file git tracks. Work the request needs is recorded as a follow-up request,
never done here.

## Inputs

- The request, as it was reported, and any item it names.
- The project's documents, code and history, read only.
- `.qfai/assistant/rule/*`.

Every step follows `.qfai/assistant/rule/shared-skill-operating-baseline.md`
and `.qfai/assistant/rule/shared-skill-delegation-baseline.md`. Questions to
the user follow
`.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Steps

Invoked by name, run the steps in this order, as
`.qfai/assistant/rule/shared-skill-operating-baseline.md#a-parent-skill-invoked-by-name`
states: read `.qfai/assistant/step/<name>/STEP.md` for the current step only,
run it, then move to the next.

| Step                     | What it does                                                   | Skipped when                                                                     |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `triage-dedupe`          | Finds the same or a successor item, and links it               | The request neither may repeat an existing item nor rests on a premise that aged |
| `triage-request-info`    | Asks for the facts the request is missing                      | The request states every fact its handling needs                                 |
| `triage-investigate`     | Reads internals, history and outside facts to find the answer  | The documents and code as they stand answer the question                         |
| `triage-answer`          | Answers, citing what shows the answer                          | The request asks no question                                                     |
| `triage-decompose`       | Splits the request into child requests with their dependencies | The request is one piece of work                                                 |
| `triage-cluster`         | Groups automated reports by signature                          | The request is not a set of automated reports                                    |
| `triage-security-intake` | Takes a vulnerability report in privately                      | The request reports no exploitable weakness                                      |
| `triage-handoff`         | Gives a person the steps of an operation only they can run     | The request needs no operation that only a person can run                        |
| `triage-close`           | Records the outcome and each follow-up, and closes             | Only `triage-security-intake` ran: the fix follows it, so the request stays open |

Invoked by name, the skill ends at this stage. It starts no other stage and
routes no follow-up: a request to carry a follow-up out goes to `qfai-run`.

Inside an `npx qfai workflow` run, the work order lists the steps to run and
this file adds nothing to it.

## Review

Invoked by name, the skill runs no review: its steps change no tracked file.
Each step's `## Gate` section says what passes it.

### Reviewer Gate

A tracked file the stage changed fails the review, whatever the change was.

## Completion

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`.
**Smallest applicable smoke check** (this skill's override):
`git status --porcelain --untracked-files=no` lists no file the stage did not
find changed when it started.

The report states the outcome `triage-close` recorded and lists each follow-up
request. It never says a change is done. It ends with a question listing the
next actions, as `.agents/rules/user-questions.md` § 6 sets out; under a
no-question mode, list them in the report instead.

## Default Autopilot Policy

- hard-required:
  - triage request (the request to answer, close, split or hand over; an empty request is asked for, never guessed)

project_memory:

- Triage changes no tracked file; work it finds is a follow-up request.
- A follow-up is recorded, never routed inside the run that found it.
- A security report stays private until the fix is ready to disclose.
