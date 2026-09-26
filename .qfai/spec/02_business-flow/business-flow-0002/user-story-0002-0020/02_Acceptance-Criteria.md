# Acceptance Criteria

## Criteria

```gherkin
Feature: Retire the duplicate validate workflow without weakening the required check

# AC-0002-0020-01
# Parent: US-0002-0020
Scenario: The duplicate validate workflow is retired and its coverage is folded, not dropped
  Given the repository's own copy of the shipped validate workflow is the thirteenth install and the sixth build per pull request
  And it has silently diverged from the shipped copy of the same name
  When it is deleted and its full-profile run is folded into the build job
  Then the duplicate workflow file is absent
  And exactly one workflow is triggered by a pull request
  And the full profile runs from the build job against the repository root, using the locally built binary rather than the published package
  And the folded run becomes part of that job's enumerated verification set, so removing it later is a release blocker

# AC-0002-0020-02
# Parent: US-0002-0020
Scenario: The only cross-check a reviewer can perform by eye is not removed before an automated one exists
  Given no drift gate covers the shipped workflows tree today
  And the repository's own copy is currently the only cross-check a reviewer can perform by eye
  When the deletion is proposed
  Then the structural contract gate over the shipped set is present in the same change or in an earlier one
  And a change that deletes the copy while no such gate exists is rejected in review
  And the justification recorded is the loss of the manual cross-check, not the absence of a mirror, which was already absent
```
