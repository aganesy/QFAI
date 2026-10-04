---
name: implement-stress-harness
owner: qfai-implement
purpose: "Build a harness that makes an intermittent failure appear on demand, under load or under a controlled schedule, and record how often it appears."
requires: [common-gate-run]
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
---

# implement-stress-harness

A failure comes and goes: a race, a timing window, a failure under load. This
step builds the harness that reproduces it, so the diagnosis and the fix can
be checked against something more than one lucky run.

## Reads

- The report: the request, or the work order, with what is known about when
  the failure appears.
- The commands of `common-gate-run`, and the test tools the project already
  carries.

## Procedure

1. Pick the cheapest pressure that reaches the failure:
   - a deterministic schedule: a fixed seed, an injected clock, or a
     controlled order of the operations that interleave;
   - load: many concurrent callers or repeated runs.

   Prefer a deterministic schedule. A seed that reproduces the failure every
   time is worth more than a load that reproduces it one run in fifty.

2. Write the harness beside the project's tests, using a test tool the
   project already has before adding one.
3. Run it a recorded number of times at the current revision and count the
   failures. The failure appears at least once, with the reported signature.
4. Keep the harness out of the default suite when it runs longer than that
   suite's budget, and record the command that runs it.

## What it writes

- The harness files, listed in `changedFiles`. The step changes no production
  code.
- A record of the pressure, the seed or load, the number of runs and the
  number of failures, in the stage report.

## Gate

The step is done when the harness reproduces the reported failure at a
recorded rate, no production code changed, and the qa-gatekeeper observed the
runs.
