# Acceptance Criteria

## Criteria

```gherkin
Feature: Continue, or stop, an interrupted run

# AC-0001-0196-01
# Parent: US-0001-0196
Scenario: Resume checks the run before it returns work
  Given an interrupted run
  When `resume` is called
  Then run, worktree and branch identity, journal integrity and tool and policy compatibility are checked first
  And a run record written by a newer package is refused

# AC-0001-0196-02
# Parent: US-0001-0196
Scenario: Resume continues at the pending example
  Given a run interrupted mid-implement with nothing upstream changed
  When the operator says continue in a new session
  Then `resume` returns the work order of the pending example
  And no story-authoring or discussion stage reruns

# AC-0001-0196-03
# Parent: US-0001-0196
Scenario: Only the receipts a change reaches are redone
  Given a run whose receipts are recorded
  When an upstream criterion changes, or an unrelated file changes
  Then only the receipts that depend on the criterion go stale
  And an unrelated change keeps every receipt valid

# AC-0001-0196-04
# Parent: US-0001-0196
Scenario: A lock is never taken over on age alone
  Given a worktree whose run holds the lock
  When a second `start` is made, or the lock owner looks gone
  Then the second `start` is refused
  And a takeover happens only after the owner's liveness, host and pending event are checked

# AC-0001-0196-05
# Parent: US-0001-0196
Scenario: A damaged journal stops the run and is never repaired to success
  Given a journal with a torn event, a sequence gap or a hash mismatch
  When any operation reads it
  Then the run is `failed` with the fault named
  And the snapshot is rebuilt from the journal and never trusted over it

# AC-0001-0196-06
# Parent: US-0001-0196
Scenario: A stop ends the run and recovery touches only the run's own paths
  Given a run in any non-terminal state
  When the operator stops it
  Then the run is `cancelled` and nothing further is written or asked
  And any recovery proposed is a reverse diff of the paths the run wrote

# AC-0001-0196-07
# Parent: US-0001-0196
Scenario: Retries follow their class and a budget never counts as a pass
  Given a run whose delegation is saturated or unavailable, whose test fails, whose input is stale, or that reaches a budget
  When the core handles it
  Then a saturated delegation is retried with backoff, at most three times
  And an unavailable delegation or a spent budget leaves the run `blocked`, never completed
  And a test failure goes to the owner of the failing artifact, and stale input is refreshed, never resubmitted

# AC-0001-0196-08
# Parent: US-0001-0196
Scenario: The run judges cumulative changes against its authorized boundary
  Given a run whose stages write their own records and whose core writes tracked evidence
  When the run checks a later write operation or `finish`
  Then those changes are admitted against the state fixed at `start`
  And a `scope-dependency` repair made outside the run is admitted only for approved, named paths at their recorded digests
  And an unapproved or changed external path is refused

# AC-0001-0196-09
# Parent: US-0001-0196
Scenario: File faults and platforms do not change a verdict
  Given a run operation
  When a file read or write fails with `EBUSY`, `EPERM` or `EACCES`, or the same run cycle runs on Linux and on Windows
  Then the failing operation is refused `io-error` after one attempt
  And both platforms give the same verdicts, with equal digests for LF and CRLF copies

# AC-0001-0196-10
# Parent: US-0001-0196
Scenario: Every operation follows the edge table
  Given a run in any state
  When an operation has no edge from that state
  Then it is refused, or `finish` lists the unmet condition, and the state is unchanged
  And a terminal run accepts no further event
```
