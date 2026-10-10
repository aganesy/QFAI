---
name: verify-repeat-run
owner: qfai-verify
purpose: "Show that the named tests pass on a recorded number of consecutive runs, which is also what lifts a quarantine."
requires: [common-gate-run]
roles: [orchestrator, devops-ci-engineer]
routing-profile: default
---

# verify-repeat-run

One passing run does not show that an intermittent failure is gone. This step
runs the named tests many times in a row on one revision and records every
run.

## Reads

- The tests to repeat: those the quarantine record names, or those the fix of
  an intermittent failure changed or added.
- The failure rate the diagnosis measured, and how it exposed the failure: the
  stress harness, the parallelism and the order.
- The number of runs the quarantine record or the work order names, where one
  does.
- The Test command, through `common-gate-run`.
- The diagnosis and its executed same-signature Red, and observed Green
  evidence for the current exact revision.

## Writes

- In the stage report: the number of runs and why, then
  every run in order, each with its command, result and revision.
- Where the runs lift a quarantine: the removal of the quarantine marker and
  record the quarantine added, and nothing else.

## Procedure

### Applicability on entry

This step always checks the diagnosis and test evidence. Only a
`fix-intermittent` diagnosis of a verified ordinary cause, with a prior
executed Red of the same failure signature and observed Green for the current
exact revision, can make repetitions unnecessary. The cause must have no
clock, operation order, parallelism, load, timing or race dependence or
uncertainty. A fixed seed or deterministic schedule exposing a race does not
qualify. Quarantine never uses this case: lifting one always requires the
actual consecutive runs below.

Missing or unexecuted Red, another signature, stale Green, pending CI, an
unknown cause or unresolved timing or load uncertainty require the real runs.
Unavailable tools, waits or limited time do not make repetitions unnecessary.
When the evidence qualifies, cite the inspected diagnosis, prior Red and
current Green, including their commands, results and revisions, in the stage
report, with the applicability reason and why load or soak is unnecessary. State that repeat runs were not performed. The gate
checks this proof and reason; report no repeat-run PASS. A later cause never
changes the earlier record of what ran.

### When repeated runs are required

1. Fix the number of runs before the first one, and record it with its reason.
   Where nothing names a number, take at least three divided by the failure
   rate the diagnosis measured, so a failure that rate predicts would show.
2. Run the tests that many times in a row on one revision, the way the
   diagnosis exposed the failure.
3. Record every run in order. Reporting only the runs that passed is selective
   reporting, as
   `.qfai/assistant/rule/references/gate-failure-autorepair.md#nondeterministic-gates`
   says.
4. One failure ends the step. Inside a run, return `needs_repair` with the
   failure in `debts`, owned by the skill that owns the failing test's layer or
   the code it exercises. The count starts again only after a new fix.
5. When every run passed, lift the quarantine where there is one.

## Gate

When repeated runs are required:

- The number of runs was fixed and recorded before the first run.
- Every run is recorded, and all of them passed on the same revision.
- A lifted quarantine removed only its marker and its record.

For the ordinary `fix-intermittent` case, the inspected diagnosis, prior Red,
current exact-revision Green and applicability reason are recorded. No
unperformed repetitions count as passed, and no quarantine is lifted.
