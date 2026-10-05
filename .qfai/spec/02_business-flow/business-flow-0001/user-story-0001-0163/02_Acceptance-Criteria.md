# Acceptance Criteria

## Criteria

```gherkin
Feature: Orchestrator Protocol
  # AC-0001-0163-02
  Scenario: Capability Probe Uses Real Delegation
    Given a skill stage runs
    When the session chooses to delegate
    Then the real delegation attempt acts as the capability check, no preflight availability confirmation gates execution, and no delegation attempt is required at the start of the stage.

  # AC-0001-0163-03
  Scenario: Delegation Failure Hard Stop
    Given a delegation the session chose to make fails
    When the orchestrator handles the failure
    Then it classifies the failure as `unavailable` or `saturated` and no simulated role is used in either class. An `unavailable` failure lets the session do the work itself, unless the work is a review someone other than the author has to do; there the stage stops and the user receives failure reason, failure class, attempted role/task, remediation guidance, and retry condition. A `saturated` failure is retried as the identical delegation with bounded backoff and is handled as `unavailable` once the retry budget is exhausted.

  # AC-0001-0163-04
  Scenario: No agent reviews its own authoring
    Given an artifact an agent authored or recommended
    When a review of it is required
    Then that agent never counts as its independent reviewer
    And no required reviewer is dropped to save tokens
```
