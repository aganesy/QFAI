# Acceptance Criteria

## Criteria

```gherkin
Feature: Measurement-gated build reuse and artifact-upload hygiene

# AC-0002-0016-01
# Parent: US-0002-0016
Scenario: Artifact reuse lands because the measurement supports it
  Given six bundler build executions occur per pull request today, two of them fired by the pack-verification lifecycle
  And a before-and-after baseline has been captured and recorded
  When the build is produced once, uploaded, and downloaded by the two matrix legs that rebuild today
  Then the bundler invocation count in the run logs falls against the recorded baseline
  And the two pack-lifecycle builds are unchanged, because artifact reuse cannot reach them
  And the numbers are quoted in the pull-request description as well as written to the evidence tree

# AC-0002-0016-02
# Parent: US-0002-0016
Scenario: A measured "no" is a legitimate outcome rather than a failed attempt
  Given artifact reuse adds a serializing dependency to jobs that run in parallel today
  When the captured before-and-after measurement shows a wall-clock regression
  Then the rebuilds are kept
  And the measurement is recorded as the reason in the evidence tree and quoted in the pull-request description
  And the requirement is satisfied by that record, so no retry-until-it-agrees loop is entered

# AC-0002-0016-03
# Parent: US-0002-0016
Scenario: The producer and verifier split must not hollow out the only required status check
  Given the job named build is the repository's only required status check
  When that job is split, folded into, or otherwise restructured
  Then a job of that exact name still exists
  And it carries no condition of its own, and no job it depends on carries one, because a skipped dependency makes it skipped and a skipped job reports success
  And it still performs, or depends on jobs that perform, every item of its enumerated verification set
  And no item of that set is weakened by continue-on-error
  And a removal, a rename, an added condition or a shrunk verification set is a release blocker

# AC-0002-0016-04
# Parent: US-0002-0016
Scenario: Cancelled runs stop paying storage
  Given the report upload runs unconditionally with fourteen-day retention today
  When the upload step is hardened
  Then it is skipped when the run is cancelled
  And it tolerates a missing report file rather than failing the job
  And its retention is at most seven days

# AC-0002-0016-05
# Parent: US-0002-0016
Scenario: A proposed cost or parallelism change has no measurements
  Given the proposal claims a cost, wall-clock or parallelism improvement
  When no before-and-after numbers are captured in the evidence tree and quoted in the pull request and decision record
  Then the proposal is rejected regardless of whether its implementation works
```
