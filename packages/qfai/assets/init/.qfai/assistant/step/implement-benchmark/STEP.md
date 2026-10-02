---
name: implement-benchmark
owner: qfai-implement
purpose: "Measure a slow path under fixed conditions, before a change as its baseline and after it for comparison, and record the numbers without changing any tracked file."
requires: [common-steering-refresh, common-gate-run]
roles:
  - devops-ci-engineer
  - qa-strategist
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
---

# implement-benchmark

A route that makes something faster runs this step twice: first to take the
baseline, and again after the change to compare against it. Which run this
is follows from whether the run already carries a baseline record.

## Reads

- The report: the request, or the work order, naming the slow path and any
  target it sets.
- The baseline record, on the second run.
- The commands of `common-gate-run`, including any benchmark command the
  project declares.

## Procedure

1. Fix the conditions and record them: the machine, the build mode, the
   input, the warm-up runs and the number of measured runs.
2. Use the project's benchmark command where it has one. Otherwise write a
   measuring script to a git-ignored location and name it in `artifactRefs`,
   so the second run uses the same script.
3. Measure. Record the median and the spread of each measured quantity.
4. On the second run, repeat under the recorded conditions and compare each
   quantity with the baseline. A difference inside the measured spread is no
   difference.
5. When the comparison misses the target the request or the diagnosis set,
   return `needs_repair` with a debt naming the measurement, owned by
   `qfai-implement`.

## What it writes

- The step changes no file git tracks, and the result names no changed file.
- The record under `.qfai/evidence/` holds the conditions, the numbers and, on
  the second run, the comparison. It is git-ignored and is named in
  `artifactRefs`.

## Gate

The step is done when the numbers are recorded with the conditions that
produced them, a second run compares under the same conditions, no tracked
file changed, and the qa-gatekeeper observed the runs.
