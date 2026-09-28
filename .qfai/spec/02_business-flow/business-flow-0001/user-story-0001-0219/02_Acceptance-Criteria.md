# Acceptance Criteria

## Criteria

```gherkin
Feature: Raise review and gates without changing the steps
  # AC-0001-0219-01
  Scenario: Heavy review adds reviewers and nothing else
    Given a run that carries `review:heavy`
    When the core issues its work orders
    Then every stage requires the heavy reviewers besides its steps' own
    And the stages and steps are those of the same route without the modifier

  # AC-0001-0219-02
  Scenario: A user gate stops the run only at routing and at declared decision points
    Given a run that carries `gate:user`
    When it reaches routing and each decision point its route declares
    Then it waits there for the operator's answer
    And it stops nowhere else
    And without `gate:user` each decision is taken, recorded as adopted and reported

  # AC-0001-0219-03
  Scenario: A release gate asks for release approval at the release point
    Given a run that carries `gate:release`
    When it reaches its release point
    Then it asks the operator to approve the release and records who answered
    And `finish` does not complete until the approval is recorded
    And the approval pushes, merges and publishes nothing

  # AC-0001-0219-04
  Scenario: No set of modifiers changes a route's steps
    Given any route and any set of modifiers
    When its plan is issued
    Then its stages and steps equal those of the route with no modifier

  # AC-0001-0219-05
  Scenario: Modifiers only grow during a run
    Given a run with modifiers from routing
    When a result raises another, or the run is re-routed or replanned
    Then the run keeps every modifier it had and gains the new ones
    And no payload can remove one

  # AC-0001-0219-06
  Scenario: Each modifier attaches on its signals
    Given an extraction and a route
    When the core sets the run's modifiers
    Then each modifier attaches when any one of its signals holds, and not otherwise

  # AC-0001-0219-07
  Scenario: A route's default modifiers always apply
    Given a route that declares default modifiers
    When a run takes it, whatever its extraction says
    Then the run carries them from routing

  # AC-0001-0219-08
  Scenario: A cited approved record answers the decision it settled
    Given a request that cites an approved decision row, on a run that carries `gate:user`
    When the decision point that row settles is reached
    Then the link answers it and the run does not stop there
    And a cited row that does not exist or is not in force stops the run there

  # AC-0001-0219-09
  Scenario: The set of modifiers is closed
    Given a plan or a result naming a modifier outside the three
    When it is loaded or submitted
    Then it is refused

  # AC-0001-0219-10
  Scenario: A critical decision reaches the operator whatever the modifiers
    Given a run without `gate:user`
    When a step at a decision point meets a critical decision
    Then the decision is put to the operator
    And the run carries `gate:user` from then on
```
