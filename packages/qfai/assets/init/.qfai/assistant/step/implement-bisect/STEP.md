---
name: implement-bisect
owner: qfai-implement
purpose: "Find the change that broke a behaviour between a revision where it worked and one where it fails, without changing any tracked file."
requires: [common-gate-run]
---

# implement-bisect

A behaviour worked at one revision and fails at a later one. This step finds
the first change at which it fails.

## Passes when

Read first: the report. The step passes when the report names no revision
where the behaviour worked and no release before it shows the behaviour
working. The pass names the revisions tried.

## Reads

- The report: the request, or the work order.
- The revision where the behaviour last worked, when the report names one.
- The commands of `common-gate-run`.

## Procedure

1. Write the smallest command that exits zero when the behaviour works and
   non-zero when it fails. A command that also fails for an unrelated reason
   finds the wrong change.
2. Confirm both ends with that command: it passes at the good revision and
   fails at the bad one. When the report names no good revision, try older
   releases until one passes. When none passes, stop and report that no good
   revision was found.
3. Start the session with `git bisect start <bad> <good>`. `git bisect run`
   takes only the command; it neither names the two ends nor starts the
   session.
4. Wrap the command in a script for `git bisect run <script>`. The script
   exits zero when the behaviour works, 1 to 124 when it fails, and 125 when
   the revision cannot be built or started, so bisection skips it. Any other
   non-zero exit, such as a build failure passed through, counts as bad and
   names the wrong change.
5. Run `git bisect reset` on every exit path: after bisection names a change,
   after it stops on skipped revisions, and after the run errors or is
   interrupted. The working tree is then back at the revision the step
   started on.
6. When skipped revisions leave more than one candidate, bisection names no
   first bad commit. Report the result as inconclusive with the candidate
   set git prints, and name no culprit.
7. Read the change bisection names: its commit, its message and its diff.

## Whether to revert

Report `branch: { outcome: "revert" }` when all three hold:

- the culprit is one self-contained commit;
- no later commit changes the lines it changed;
- it adds no behaviour a story or contract of the project states.

Otherwise, and when the result is inconclusive, report no `branch`. The route goes on to diagnose the failure and
fix it forward.

## What it writes

- The step changes no file git tracks, and the result names no changed file.
- The stage report holds the command, both ends, each
  revision tested with its result, and the culprit or the inconclusive
  candidate set.

## Gate

The step is done when the culprit is named with the command that shows it
passing before and failing after, or skipped revisions leave an inconclusive
candidate set that the report lists, the working tree is back at its starting
revision, and no tracked file changed.
