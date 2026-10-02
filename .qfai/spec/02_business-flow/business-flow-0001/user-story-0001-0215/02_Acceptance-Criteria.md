# Acceptance Criteria

## Criteria

```gherkin
Feature: Re-route a run when diagnosis shows it is on the wrong route
  # AC-0001-0215-01
  Scenario: A diagnosis reports one verdict from a closed set
    Given a diagnose work order
    When `implement-diagnose` returns
    Then its result carries exactly one verdict of the eleven
    And in read-only mode it changes no tracked file

  # AC-0001-0215-02
  Scenario: A run changes route only at a declared branch point, to a declared destination
    Given a run at a step its route declares a branch point
    When the step reports an outcome the point pairs with a destination
    Then the run re-routes to that destination, or to the one the result names among several, or to the one the decision rules give
    And any other outcome continues the route
    And a re-route named anywhere else, or to an undeclared destination, is refused

  # AC-0001-0215-03
  Scenario: Evidence carries over when nothing changed
    Given a re-route at an unchanged revision whose destination starts with a step the run already ran
    When the destination's plan is issued
    Then that step's receipt satisfies it and it is not issued again
    And after a change to the revision it runs again

  # AC-0001-0215-04
  Scenario: A third re-route asks the operator
    Given a run already re-routed twice
    When a branch point would re-route it again
    Then the operator is asked whether to proceed
    And under a no-question mode the run waits

  # AC-0001-0215-05
  Scenario: A finding no stage of the route serves blocks the run
    Given a result whose finding is owned by a skill no stage of the route serves
    When `accept` takes it
    Then the run is blocked, naming the finding, its owner and the skill to invoke by name
    And the route is not changed

  # AC-0001-0215-06
  Scenario: A re-route passes through routing with its destination fixed
    Given a result that re-routes the run
    When the core takes it
    Then the next work order is a routing work order naming the destination
    And the routing result sets the scope, flows and new stories for that destination without choosing another route
```
