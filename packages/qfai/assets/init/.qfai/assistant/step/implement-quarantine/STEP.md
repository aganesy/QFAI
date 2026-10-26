---
name: implement-quarantine
owner: qfai-implement
purpose: "Take a test that passes and fails on the same code out of the gating suite, with a record of why and of what lets it back in."
requires: [common-gate-run]
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

1. Show the flakiness: run the test at one revision at least five times,
   record the number of runs and count the failures. A test that fails every
   run is not flaky: see
   [A test that fails every run](#a-test-that-fails-every-run).
2. Quarantine it with the project's own mechanism. Add one only where the
   project has none.
3. Keep it running where it blocks nothing, such as a non-gating job, where
   the project can.
4. Change neither what it asserts nor the code it tests. Delete nothing.

## A test that fails every run

When all of at least five recorded runs fail, nothing is quarantined, no marker
is written and no non-gating job is added: a skip would hide a failure that is
real, and a failure rate the runs do not show cannot be invented. With fewer
runs, or with one passing run, the test is not shown to fail every run, so run
it again or quarantine it as flaky. Record the runs, their count and the
failure's signature in the stage report, then report the outcome
`failing-consistently` with an extraction of the report as a test that fails
every run, so the decision rules route it again. The stage ends there: the
stages after it do not run, and the next route's diagnosis and test repair take
over.

## What it writes

- The changed file path for the quarantine entry or marker, listed in the
  stage report. Next to it: the test, the failure's signature, the failure rate,
  and what lets it back in — a recorded number of consecutive passing runs.
- A record of the runs, in the stage report.

## Gate

The step is done when the flakiness is shown by a recorded failure rate, the
test no longer gates, and its quarantine entry states what lifts it. It is also
done when a test that failed all of at least five recorded runs is reported as
`failing-consistently`, with the runs in the stage report and nothing
quarantined.
