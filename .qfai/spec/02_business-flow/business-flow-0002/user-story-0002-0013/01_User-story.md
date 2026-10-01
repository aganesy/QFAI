# US-0002-0013: Change-derived lane selection behind a drift-proof aggregate verdict

## User Story

As a QFAI maintainer, I want CI to detect what a pull request touched, run only the lanes that change can affect and still report a correct verdict when nothing needed running, so that a documentation-only pull request runs a handful of jobs instead of all fourteen while still running the formatter and the Markdown linter.

## Non-goals

- Path filters as the selection mechanism: a path-filtered workflow reports nothing to branch protection rather than success.
- Removing an unneeded matrix leg, which would make its check name disappear.
- A hand-maintained list of lanes.
- Changing which checks branch protection requires, which is a repository-settings action.
- Selecting any lane other than the test, type-check and coverage lanes.
