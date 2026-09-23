---
id: 2026-09-23-spec-0003-six-rows-wait-on-the-document-lane-restatement
status: archived
kind: blocker
created: 2026-09-23
updated: 2026-09-23
scope: spec-0003
blocking: false
promote-to: null
closure-rationale: CR-20260923-0003 was applied and the six rows returned to todo, so nothing is blocked any more.
links: ["spec-0003"]
---

# Six spec-0003 rows wait on the document-lane restatement

## What is blocked

`TDD-0058` to `TDD-0063` in `.qfai/specs/spec-0003/tdd/test-list.md`. Their
tests exist and pass, and each row's falsifying mutation was observed:

| Row        | Mutation                                                         | What failed                 |
| ---------- | ---------------------------------------------------------------- | --------------------------- |
| `TDD-0058` | `check: [shape, mermaid]` to `check: [shape]` in `qfai-docs.yml` | the leg list                |
| `TDD-0059` | the docs aggregate's `name:`                                     | the external check name     |
| `TDD-0060` | the drift step's pull-request condition in `qfai-validate.yml`   | the profile invocations     |
| `TDD-0061` | the validate aggregate's `name:`                                 | the external check name     |
| `TDD-0062` | the docs aggregate's `exit 1` to `exit 0`                        | six violations against none |
| `TDD-0063` | the result-binding guard in `aggregateFailureViolations`         | one violation against none  |

Each mutation leaves the other rows of its case green.

## Why it waits

`CR-20260923-0003` records three statements of `spec-0003` that describe the
document lane as it was before change scoping, a verify bullet with no row,
and four rows whose `Test file` sits in the end-to-end tree while their cases
are integration-level. None of that is this stage's to change.

## What releases it

The record's action list, in order: the `/qfai-sdd spec-0003` re-derive, then
`/qfai-atdd spec-0003` writing the handover entries, then the
`/qfai-implement` preflight that returns the six rows to `todo`.
