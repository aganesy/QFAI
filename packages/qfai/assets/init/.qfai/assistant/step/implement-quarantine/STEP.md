---
name: implement-quarantine
owner: qfai-implement
purpose: "Take a test that passes and fails on the same code out of the gating suite, with a record of why and of what lets it back in."
requires: [common-steering-refresh, common-gate-run, common-evidence-record]
roles:
  - devops-ci-engineer
  - qa-strategist
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
---

# implement-quarantine

A named test or job passes and fails without any change to the code. This
step stops it from blocking others while its cause is found. It does not fix
it.

## Reads

- The report, naming the test or job.
- The project's way of quarantining a test, where it has one: a skip marker,
  a quarantine list, a tag the gating suite excludes.
- The commands of `common-gate-run`.

## Procedure

1. Show the flakiness: run the test a recorded number of times at one
   revision and count the failures. A test that fails every time is not
   flaky; stop and report it as failing.
2. Quarantine it with the project's own mechanism. Add one only where the
   project has none.
3. Keep it running where it blocks nothing, such as a non-gating job, where
   the project can.
4. Change neither what it asserts nor the code it tests. Delete nothing.

## What it writes

- The quarantine entry or marker, listed in `changedFiles`. Next to it: the
  test, the failure's signature, the failure rate, and what lets it back in —
  a recorded number of consecutive passing runs.
- A record of the runs, written with `common-evidence-record`.

## Gate

The step is done when the flakiness is shown by a recorded failure rate, the
test no longer gates, its quarantine entry states what lifts it, and the
qa-gatekeeper observed the runs.
