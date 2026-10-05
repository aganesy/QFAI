# Acceptance Criteria

## Criteria

```gherkin
Feature: Get one fixed plan for every kind of request
  # AC-0001-0220-01
  Scenario: The close family answers or closes a request without a change
    Given a route of the `close` family
    When its plan is issued
    Then its stages run only triage steps and end at `triage-close`

  # AC-0001-0220-02
  Scenario: The decide family ends in a decision record
    Given a route of the `decide` family
    When its plan is issued
    Then it records a decision or a split and ends at `triage-close`

  # AC-0001-0220-03
  Scenario: The consistency family aligns declared surfaces
    Given a route of the `consistency` family
    When its plan is issued
    Then it diagnoses, decides the owning surface, changes what does not own the truth and verifies

  # AC-0001-0220-04
  Scenario: The change family adds, changes or tidies behaviour
    Given a route of the `change` family
    When its plan is returned
    Then its stages match the kind of change and end with the verify block

  # AC-0001-0220-05
  Scenario: The fix family repairs running behaviour
    Given a route of the `fix` family
    When its plan is issued
    Then it prepares what its kind of defect needs, diagnoses, fixes and verifies

  # AC-0001-0220-06
  Scenario: The upkeep family keeps tests, CI and dependencies working
    Given a route of the `upkeep` family
    When its plan is returned
    Then it changes the test, the pipeline or the dependency and verifies

  # AC-0001-0220-07
  Scenario: The release family prepares a release or hands work to a person
    Given a route of the `release` family
    When its plan is issued
    Then it stops for release approval where it releases, and never publishes on its own
```
