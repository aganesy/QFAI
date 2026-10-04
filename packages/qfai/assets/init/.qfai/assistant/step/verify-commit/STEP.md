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
- The files the run changed, from `git status`.
- The project's commit message convention, where it states one.

## Writes

- One commit on the current branch holding the run's changes.
- In the stage report: the commit, and the files it holds.

The step never pushes, opens a pull request or merges. Each of those waits for
the user's own instruction.

## Procedure

1. Stop when a verify gate failed or did not run, and say which.
2. Stage only the files the run changed. A file that was already modified
   before the run started stays out.
3. Commit with a message in the project's convention that says what changed
   and why.
4. Where a commit hook refuses the commit, fix the cause and commit again.
   Never skip the hook.

## Gate

- The commit exists and holds every file the run changed, and no other.
- Nothing was pushed, and no pull request or merge was made.
