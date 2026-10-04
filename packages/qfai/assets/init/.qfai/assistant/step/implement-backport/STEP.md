---
name: implement-backport
owner: qfai-implement
purpose: "Check that a merged change meets the project's backport criteria and carry it onto the release branch it names, passing that branch's gates."
requires: [common-steering-refresh, common-gate-run]
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
routing-profile: default
---

# implement-backport

The request names a change already merged and a release branch to carry it
to.

## Reads

- The project's backport policy, where it has one.
- The change: its commits on the main line, and the report it fixed.
- The release branch, and the commands of `common-gate-run` as that branch
  runs them.

## Procedure

1. Check the criteria: the change is merged, the release branch is still
   supported, and the change meets what the policy asks, such as its severity.
   When one fails, stop and report which.
2. Branch from the release branch and apply each commit with
   `git cherry-pick -x`, so each records where it came from.
3. Resolve a conflict to the release branch's code. Bring in no other change
   the conflict seems to need; list it instead, and stop when the change does
   not work without it.
4. Run the release branch's suite and its Lint, Typecheck and Build commands.

Do not push, merge, tag or publish. Those wait for the release approval the
route asks for.

## What it writes

- The backport branch and the files it changes, listed in `changedFiles`.
- A record of the criteria checked, each commit picked, each conflict and how
  it was resolved, and each gate result, in the stage report.

## Gate

The step is done when the criteria are recorded as met, every commit is
picked with its origin, the release branch's gates pass, and nothing was
pushed or published.
