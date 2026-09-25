# Acceptance Criteria

## Criteria

```gherkin
Feature: Change-derived lane selection behind a drift-proof aggregate verdict

# AC-0002-0013-01
# Parent: US-0002-0013
Scenario: A newly added job fails and the aggregate verdict notices without being edited
  Given the aggregate verdict job derives its result by iterating its serialized needs map
  And a new job is wired only into that needs list, with no edit to the verdict body
  When that job concludes as failed
  Then the verdict exits 1 and names the failed need
  And when the same job is instead cancelled, the verdict still exits 1
  And the verdict check name is unchanged in both runs

# AC-0002-0013-02
# Parent: US-0002-0013
Scenario: The verdict distinguishes "nothing needed running" from "nothing was verified"
  Given the aggregate verdict job derives its result from the state of every need
  When every need concluded as succeeded
  Then the verdict exits 0
  And when every need was skipped because change detection selected no lane, the verdict exits 0
  And an unrecognized need state fails closed rather than being read as success

# AC-0002-0013-03
# Parent: US-0002-0013
Scenario: A Markdown-only change runs the jobs the pin records, and skips the rest
  Given the repository's duplicate validate workflow has already been retired
  And every retained test matrix leg is declared and its job carries a condition derived from the detection output
  When a pull request touches only Markdown files outside the recognized source directories
  Then the jobs that execute are the ones carrying no condition plus the aggregate verdict, whose condition is always
  And that set, and the sum of its members' declared timeout-minutes, are the values pinned for this path
  And of the jobs the verdict depends on, the executing ones are exactly the declared dependencies that carry no pinned condition, each named with the reason it cannot be skipped
  And each unneeded matrix job reports one skipped check under its bare job name before matrix expansion
  And no skipped matrix job consumes runner minutes
  And the aggregate verdict reports success

# AC-0002-0013-04
# Parent: US-0002-0013
Scenario: The diff cannot be computed, so everything runs
  Given the change-detection job requests full history and diffs against the base commit
  When the diff fails because the clone is shallow or the base ref is unreachable
  Then the job emits an explicit warning annotation naming the reason
  And it selects the full lane set rather than skipping anything
  And the aggregate verdict is still reachable and still green when every selected lane passes

# AC-0002-0013-05
# Parent: US-0002-0013
Scenario: The exclusion set is a closed list, and the assistant tree is not documentation
  Given change detection classifies a change against a recognized-directory list
  When a pull request touches a path outside every recognized directory
  Then the full lane set is selected
  And when a pull request touches Markdown under the assistant catalog tree, the full lane set is selected
  And when a pull request touches only the agent-integration mirrors, they are treated as documentation-only

# AC-0002-0013-06
# Parent: US-0002-0013
Scenario: A lane is exempt when skipping it would leave a gate with nothing to check, or report a green nobody earned
  Given the lint aggregate's lanes carry the formatter, the Markdown linter, the leakage guard, the pin guard and the agent-integration mirror guards
  And a skipped job reports success to branch protection
  When change detection selects no test lane at all
  Then the lint lane still runs, so the formatter and Markdown gates are not vacuous for a documentation change
  And the lane carrying the agent-integration mirror guards still runs, whichever job hosts it
  And the job carrying a required status context still runs unconditionally while it carries it
  And the required ci-pass context is unchanged; full runs report expanded matrix names and documentation-only runs report skipped bare job names
```
