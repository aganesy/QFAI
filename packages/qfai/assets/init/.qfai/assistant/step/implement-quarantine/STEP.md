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
   record the number of runs and count the failures. The test is flaky only
   when the runs at that one revision hold at least one failure matching the
   report and at least one pass. A test that fails every run is not flaky: see
   [A test that fails every run](#a-test-that-fails-every-run). A test that
   passes every run is not shown to be flaky: see
   [A test that passes every run](#a-test-that-passes-every-run).
2. Quarantine it with the project's own mechanism. Add one only where the
   project has none.
3. Keep it running where it blocks nothing, such as a non-gating job, where
   the project can.
4. Change neither what it asserts nor the code it tests. Delete nothing.

## A test that fails every run

When all of at least five recorded runs fail, nothing is quarantined, no marker
is written and no non-gating job is added: a skip would hide a failure that is
real, and a failure rate the runs do not show cannot be invented. With fewer
runs, the test is not shown to fail every run, so run it again. With at least
one pass and one matching failure on that revision, it is flaky: quarantine it.
Record the runs, their count and the
failure's signature in the stage report, then report the outcome
`failing-consistently` with an extraction of the report as a test that fails
every run, so the decision rules route it again. The stage ends there: the
stages after it do not run, and the next route's diagnosis and test repair take
over.

## A test that passes every run

When every recorded run passes, the failure is not reproduced: nothing is
quarantined, no marker is written and no non-gating job is added, because a
quarantine would take a test that shows no failure out of the gate. A failure
rate of zero does not show flakiness. Record the runs and their count in the
stage report, and record the test as `unreproduced`.

## What it writes

- The changed file path for the quarantine entry or marker, listed in the
  stage report. Next to it: the test, the failure's signature, the failure rate,
  and what lets it back in — a recorded number of consecutive passing runs.
- A record of the runs, in the stage report.

## Gate

The step is done when the flakiness is shown by recorded runs on one revision
that hold at least one matching failure and at least one pass, the test no
longer gates, and its quarantine entry states what lifts it. It is also done
when a test that failed all of at least five recorded runs is reported as
`failing-consistently`, with the runs in the stage report and nothing
quarantined, and when a test that passed every recorded run is recorded as
`unreproduced`, with the runs in the stage report and no quarantine marker.
