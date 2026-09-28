# Acceptance Criteria

## Criteria

```gherkin
Feature: Get one fixed plan for every kind of request
  # AC-0001-0227-01
  Scenario: The close family answers or closes a request without a change
    Given a route of the `close` family
    When its plan is issued
    Then its stages run only triage steps and end at `triage-close`

  # AC-0001-0227-02
  Scenario: The decide family ends in a decision record
    Given a route of the `decide` family
    When its plan is issued
    Then it records a decision or a split and ends at `triage-close`

  # AC-0001-0227-03
  Scenario: The consistency family aligns declared surfaces
    Given a route of the `consistency` family
    When its plan is issued
    Then it diagnoses, decides the owning surface, changes what does not own the truth and verifies

  # AC-0001-0227-04
  Scenario: The change family adds, changes or tidies behaviour
    Given a route of the `change` family
    When its plan is issued
    Then its stages match the kind of change and end with the verify block

  # AC-0001-0227-05
  Scenario: The fix family repairs running behaviour
    Given a route of the `fix` family
    When its plan is issued
    Then it prepares the evidence its kind of defect needs, diagnoses, fixes and verifies

  # AC-0001-0227-06
  Scenario: The upkeep family keeps tests, CI and dependencies working
    Given a route of the `upkeep` family
    When its plan is issued
    Then it changes the test, the pipeline or the dependency and verifies

  # AC-0001-0227-07
  Scenario: The release family prepares a release or hands work to a person
    Given a route of the `release` family
    When its plan is issued
    Then it stops for release approval where it releases, and never publishes on its own

  # AC-0001-0227-08
  Scenario: A route binds a flow only when a stage needs one
    Given a route and a routing proposal naming one flow or none
    When the proposal is checked
    Then a route with a story, prototype, acceptance or test-writing stage binds exactly one flow
    And a route whose only flow-facing stage fixes tests binds the one flow named, or none
    And any other route binds no flow
```
