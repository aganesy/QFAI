---
name: implement-revert
owner: qfai-implement
purpose: "Undo the change a bisection named as the cause of a failure, and confirm the failure is gone and nothing else broke."
requires: [common-steering-refresh, common-gate-run]
roles:
  - frontend-engineer
  - backend-engineer
  - implementation-reviewer
  - qa-gatekeeper
routing-profile: implementation-heavy
---

# implement-revert

A bisection named the change that broke a behaviour, and found it can be
undone whole. This step undoes it. The failure's example and its test follow
in the next stages.

## Reads

- The bisection record the run carries: the culprit commit and the command
  that fails since it.
- The commands of `common-gate-run`.

## Procedure

1. Apply the inverse of the culprit to the working tree with
   `git revert --no-commit <commit>`. For a merge commit, name the parent
   whose side is kept with `-m`.
2. Resolve a conflict by keeping what later changes did. A conflict that can
   only be resolved by changing behaviour a later change added is not this
   step's: return `blocked`, listing the conflicting paths with `operator` as
   the `resolvingOwner`.
3. Run the bisection's command. It now passes.
4. Run the relevant suite, then the Lint, Typecheck and Build commands. Each
   passes.

## What it writes

- The files the revert changes, listed in `changedFiles`. Nothing else.
- Where a flow is bound, a record of the culprit, the revert and each command
  with its result, in the stage report.

## Gate

The step is done when the culprit's change is undone, the bisection's command
passes, the suite and the project gates pass, and the qa-gatekeeper observed
those results.
