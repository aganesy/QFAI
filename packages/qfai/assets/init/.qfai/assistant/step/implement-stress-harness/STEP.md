---
name: implement-stress-harness
owner: qfai-implement
purpose: "Build a harness that makes an intermittent failure appear on demand, under load or under a controlled schedule, and record how often it appears."
requires: [common-gate-run]
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
routing-profile: default
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
- Existing Red evidence with its command, signature and revision, and the
  evidence that establishes its cause.

## Procedure

### Applicability on entry

This step always checks the evidence on entry. Pressure is unnecessary only
when a prior executed Red reproduces the same failure signature and a verified
ordinary cause explains it without clock, operation order, parallelism, load,
timing or race dependence. A fixed
seed or controlled schedule that exposes a race is not an ordinary cause.
Uncertainty requires the real harness below. Missing or unexecuted Red,
another signature or an unknown cause cannot justify omitting pressure.
Stale or pending CI, unavailable tools, waits and limited time do not supply
missing proof. A cause found later cannot justify claiming that an earlier
harness was unnecessary or not performed.

When the entry evidence qualifies, build no harness and run no pressure. In
the stage report, cite the inspected Red and cause evidence, record why load
or soak is unnecessary, and state that the stress run was not performed. The
gate checks this applicability reason and its proof; report no stress PASS.

### When a harness is required

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

When a harness is required, the step is done when it reproduces the reported
failure at a recorded rate, and no production code changed.
For the ordinary-cause case, the entry proof and applicability reason are
recorded, and no production code changed. No unperformed stress run counts
as passed.
