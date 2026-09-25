---
id: 2026-09-25-spec-0001-entry-check-states
status: active
kind: blocker
created: 2026-09-25
updated: 2026-09-25
scope: spec-0001
blocking: true
promote-to: null
links: ["spec-0001"]
---

# Entry-check states behind one row

## What is blocked

`TDD-0035` is `blocked` on `CR-20260925-0285`. It had closed at `exception`
under `DR-0298` with its reviews waived, and was reopened to take them.

## Why it waits

The row's one test asserts three states of the entry check, `pass-on`,
`worker` and `off`, in one function. A function fails once, so only the first
failing assertion is ever observed, and the RED recorded under `DR-0298` failed
before any state-specific assertion. Splitting the row is `/qfai-sdd` Phase
2b's write, so the run stopped at Phase Red step 1.

## What releases it

After the user approves an option of `CR-20260925-0285`, `/qfai-sdd` re-scopes
the row and seeds the other states' rows, and `/qfai-atdd` splits the test. The
handover in `.qfai/evidence/atdd-spec-0001.md#tdd-0035` then stands for the
`pass-on` state. `/qfai-implement` takes each row through its reviews.
