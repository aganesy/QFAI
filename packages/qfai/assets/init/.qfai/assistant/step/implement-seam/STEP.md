---
name: implement-seam
owner: qfai-implement
purpose: "Land the minimal connection an acceptance test needs to reach its assertion, and leave that test failing at the assertion."
requires: [common-gate-run]
roles:
  - frontend-engineer
  - backend-engineer
routing-profile: default
---

# implement-seam

An acceptance result asked for a seam: the target test cannot reach its
assertion, because a route, an export or an entrypoint it calls does not exist
yet. This step adds that connection and nothing else. The main implementation
waits until the acceptance stage has taken RED.

## Reads

- The acceptance result's seam request and the target test it names.
- `.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md` and
  `.qfai/assistant/skill/qfai-implement/references/red-admissibility.md`, and
  `.qfai/assistant/skill/qfai-implement/references/red-not-observable.md` where
  production already satisfies the example.
- The commands of `common-gate-run`.

## Procedure

1. Only the minimal connection the target test needs is landed. It does not
   implement the behaviour the test checks.
2. Run the target test. The test is left failing at its assertion; record
   that failure.
3. Record the seam with its ceiling and the condition that lifts it, under
   `.agents/rules/minimal-implementation.md`, and report the run in the stage
   report.

Name the target test and the observation it must expose in the stage report.
Include the changed paths in that report.

## When the seam cannot be landed or observed

- A cause outside the stage's write areas, such as a missing environment, is
  returned `blocked`. Record the cause in the stage report, with the operator
  as its owner and the missing capability that must be available to resume.
- A cause the stage can repair inside its write areas is returned
  `needs_repair`, never `blocked`. Record the repair scope and its owner in
  the stage report.
- None of these results reports a `pass` observation, and the main
  implementation still waits.
- A reissued seam request is served as a new attempt of this step.

## Gate

The step is done when the seam is landed and the target test fails at its
assertion, not before it.
