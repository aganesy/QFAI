# Acceptance Criteria

## Criteria

```gherkin
Feature: Re-route a run when diagnosis shows it is on the wrong route
  # AC-0001-0215-01
  Scenario: A diagnosis reports one verdict from a closed set
    Given a diagnose stage
    When `implement-diagnose` returns
    Then it reports exactly one verdict of the eleven
    And in read-only mode it changes no tracked file

  # AC-0001-0215-02
  Scenario: A run changes route only at a declared branch point, to a declared destination
    Given a run at a step its route declares a branch point
    When the step reports an outcome the point pairs with a destination
    Then the run re-routes to that destination, or to the one the result names among several, or to the one the decision rules give
    And any other outcome continues the route
    And a re-route named anywhere else, or to an undeclared destination, is refused
```
