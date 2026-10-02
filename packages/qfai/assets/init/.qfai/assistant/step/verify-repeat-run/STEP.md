---
name: verify-repeat-run
owner: qfai-verify
purpose: "Show that the named tests pass on a recorded number of consecutive runs, which is also what lifts a quarantine."
requires: [common-gate-run, common-evidence-record]
roles:
  [orchestrator, devops-ci-engineer, qa-gatekeeper, completion-reviewer, implementation-reviewer]
routing-profile: runtime-heavy
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

## Writes

- In `.qfai/evidence/verify-<run-id>.md`: the number of runs and why, then
  every run in order, each with its command, result and revision.
- Where the runs lift a quarantine: the removal of the quarantine marker and
  record the quarantine added, and nothing else.

## Procedure

1. Fix the number of runs before the first one, and record it with its reason.
   Where nothing names a number, take at least three divided by the failure
   rate the diagnosis measured, so a failure that rate predicts would show.
2. Run the tests that many times in a row on one revision, the way the
   diagnosis exposed the failure.
3. Record every run in order. Reporting only the runs that passed is selective
   reporting, as
   `.qfai/assistant/rule/shared-skill-operating-baseline.md#nondeterministic-gates`
   says.
4. One failure ends the step. Inside a run, return `needs_repair` with the
   failure in `debts`, owned by the skill that owns the failing test's layer or
   the code it exercises. The count starts again only after a new fix.
5. When every run passed, lift the quarantine where there is one.

## Gate

- The number of runs was fixed and recorded before the first run.
- Every run is recorded, and all of them passed on the same revision.
- A lifted quarantine removed only its marker and its record.
- The qa-gatekeeper checked the count and that no run is missing.
