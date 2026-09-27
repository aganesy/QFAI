---
name: implement-seam
owner: qfai-implement
purpose: "Land the minimal connection an acceptance test needs to reach its assertion, and leave that test failing at the assertion."
requires: [common-steering-refresh, common-gate-run, common-evidence-record]
roles:
  - frontend-engineer
  - backend-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - completion-reviewer
routing-profile: implementation-heavy
---

# implement-seam

An acceptance result asked for a seam: the target test cannot reach its
assertion, because a route, an export or an entrypoint it calls does not exist
yet. This step adds that connection and nothing else. The main implementation
waits until the acceptance stage has taken RED.

## Reads

- The acceptance result's seam request and the target test it names.
- `.qfai/assistant/skill/qfai-implement/references/walking-skeleton.md` and
  `.qfai/assistant/skill/qfai-implement/references/red-admissibility.md`.
- The commands of `common-gate-run`.

## Procedure

1. Only the minimal connection the target test needs is landed. It does not
   implement the behaviour the test checks.
2. Run the target test. The test is left failing at its assertion; record
   that failure.
3. Record the seam with its ceiling and the condition that lifts it, under
   `.agents/rules/minimal-implementation.md`, and the run with
   `common-evidence-record`.

Inside a workflow run, the result names the target test in
`seam.targetTestId`.

## When the seam cannot be landed or observed

- A cause outside the stage's write areas, such as a missing environment, is
  returned `blocked`, with the cause listed in `debts` and `operator` as its
  `resolvingOwner`.
- A cause the stage can repair inside its write areas is returned
  `needs_repair`, never `blocked`.
- None of these results reports a `pass` observation, and the main
  implementation still waits.
- A reissued seam request is served as a new attempt of this step.

## Gate

The step is done when the seam is landed and the target test fails at its
assertion, not before it.
