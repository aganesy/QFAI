---
name: verify-commit
owner: qfai-verify
purpose: "Commit the run's changes to the current branch, after the gates pass."
requires: []
roles: [orchestrator]
routing-profile: default
---

# verify-commit

The last step of a change route. It records the run's work as a local commit.

## Reads

- The verify results in the stage report.
- The paths the run wrote, as its stage reports name them.
- The project's commit message convention, where it states one.

## Writes

- One commit on the current branch holding the run's changes.
- In the final report: the commit, and the files it holds.

The step never pushes, opens a pull request or merges. Each of those waits for
the user's own instruction.

## Procedure

1. Stop when a verify gate failed or did not run, and say which. A gate that
   fails the same way on the base commit is still a failed gate: the final
   report names its baseline, and the commit waits for the user's instruction.
2. Stage exactly the tracked deliverables the run wrote, with
   `git add <those paths>`. Never `git add -A`, `git add .` or `git add -f`,
   and never a file git ignores, such as `.qfai/report/*`. A file that was
   already modified before the run and then written by it is committed whole;
   the final report names it.
3. Commit with a message in the project's convention that says what changed
   and why.
4. Where a commit hook refuses the commit, fix the cause and commit again.
   Never skip the hook. When the fix changes code or tests, rerun the verify
   gates first, and the code review too when behaviour changed.

## Gate

- The commit exists and holds exactly the tracked deliverables the run wrote.
- Nothing was pushed, and no pull request or merge was made.
