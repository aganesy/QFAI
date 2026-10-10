# Acceptance Criteria

## Criteria

```gherkin
Feature: Close, answer or hand back a request without a change
  # AC-0001-0214-01
  Scenario: A route without a change ends at triage-close with only its allowed records
    Given a route that ends at `triage-close`
    When it ends
    Then no verify stage and no review have run
    And no tracked file changed except its discussion records and a required approval row that `qfai-run` wrote in `decisions.md` before the triage step
    And every triage step changed no tracked file
    And no handed-off operation ran on the user's behalf
    And the final report states the closure outcome and never that a change is done

  # AC-0001-0214-02
  Scenario: triage-close records the outcome and the follow-ups
    Given a route that found work it does not do
    When `triage-close` returns
    Then its result records the outcome and each follow-up request
    And no step is added to the route and no follow-up is routed inside it

  # AC-0001-0214-03
  Scenario: A request waiting for information is routed again once it arrives
    Given a `request-info` route that asked for the missing facts
    When the user supplies them
    Then `triage-close` moves the work to the route the decision rules give

  # AC-0001-0214-04
  Scenario: qfai-triage is a stage skill that owns the triage steps
    Given the skills `qfai init` installs
    When `qfai-triage` is read or invoked by name
    Then it lists the nine triage steps and is covered by the stage-skill rules
    And invoked by name it changes no tracked file and ends at its stage

  # AC-0001-0214-05
  Scenario: Release notes are drafted and stop for release approval
    Given a `draft-release-notes` route
    When its draft is written
    Then the route waits for release approval with no verify stage
    And nothing is tagged or published

  # AC-0001-0214-06
  Scenario: A split request records its children as follow-ups
    Given a request that `triage-decompose` splits
    When the route closes
    Then each child is a follow-up request with its dependencies, and none is routed inside the route
```
