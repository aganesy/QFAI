---
name: implement-backport
owner: qfai-implement
purpose: "Check that a merged change meets the project's backport criteria and carry it onto the release branch it names, passing that branch's gates."
requires: [common-gate-run]
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
2. Resolve and record the pick list before branching. When explicitly
   identified constituent commits cover the requested change, list only
   those commits in application order. Check the diff of each selected ordinary
   commit against the requested backport scope. For a selected merge commit, verify the source branch
   into which the change originally landed. Use `git log --first-parent <source-ref>`
   on that branch's verified ref or historical tip. A merge on that
   first-parent history uses parent 1. Check that the diff from the
   identified parent to the merge falls within the request, and record the
   parent SHA and 1-based number. If the source branch, parent or requested
   change cannot be verified, stop before branching and report the missing
   evidence. If any selected diff includes unrelated work, stop before branching
   and report the unrelated changes.
3. Branch from the release branch and apply each ordinary commit with
   `git cherry-pick -n -x`. Apply a selected merge with
   `git cherry-pick -n -x -m <mainline-parent-number> <merge-commit>`, using the
   recorded 1-based parent number. Apply each change once. `verify-commit`
   makes the commit and names each picked commit in its message.
4. Resolve a conflict to the release branch's code. Bring in no other change
   the conflict seems to need; list it instead, and stop when the change does
   not work without it.
5. Run the release branch's suite and its Lint, Typecheck and Build commands.

Do not push, merge, tag or publish. Those wait for the release approval the
route asks for.

## What it writes

- The backport branch and the files it changes, listed in the stage report.
- A record of the criteria checked, each commit picked, each conflict and how
  it was resolved, and each gate result, in the stage report.

## Gate

The step is done when the criteria are recorded as met, every commit is
picked with its origin, the release branch's gates pass, and nothing was
pushed or published.
