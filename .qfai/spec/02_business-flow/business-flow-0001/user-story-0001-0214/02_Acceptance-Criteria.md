# Acceptance Criteria

## Criteria

```gherkin
Feature: Close, answer or hand back a request without a change
  # AC-0001-0214-01
  Scenario: A route without a change ends at triage-close and changes no tracked file
    Given a run on a route that ends at `triage-close`
    When `finish` judges it
    Then it completes with no verify stage and no `qa-gatekeeper` PASS
    And a proposal or a result that writes a tracked file outside its discussion records is refused
    And the report states the closure outcome and never that a change is done

  # AC-0001-0214-02
  Scenario: triage-close records the outcome and the follow-ups
    Given a route that found work it does not do
    When `triage-close` returns
    Then its result records the outcome and each follow-up request
    And no step is added to the run and no follow-up is routed inside it

  # AC-0001-0214-03
  Scenario: A request waiting for information is routed again once it arrives
    Given a `request-info` run that asked for the missing facts
    When the operator supplies them
    Then `triage-close` re-routes the run by the decision rules

  # AC-0001-0214-04
  Scenario: qfai-triage is a stage skill that owns the triage steps
    Given the skills `qfai init` installs
    When `qfai-triage` is read or invoked by name
    Then it lists the nine triage steps and is covered by the stage-skill rules
    And invoked by name it changes no tracked file and ends at its stage

  # AC-0001-0214-05
  Scenario: Release notes are drafted and stop for release approval
    Given a `draft-release-notes` run
    When its draft is written
    Then the run waits for release approval with no verify stage
    And nothing is tagged or published

  # AC-0001-0214-06
  Scenario: A split request records its children as follow-ups
    Given a request that `triage-decompose` splits
    When the run closes
    Then each child is a follow-up request with its dependencies, and none is routed inside the run

  # AC-0001-0214-07
  Scenario: A question is answered in one stage with no separate reviewer
    Given a run on `answer-question` or `investigate-question`
    When its work order is issued
    Then one work order runs every step of the route, the answer and the closure included
    And it names no required reviewer, unless the run carries `review:heavy`
    And `finish` follows its acceptance
```
