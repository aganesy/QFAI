# Acceptance Criteria

## Criteria

```gherkin
Feature: Route a request through a fixed decision table
  # AC-0001-0211-01
  Scenario: The extraction carries facts and `plan` decides the route
    Given an extraction of a request
    When `plan` reads it
    Then it decides the route from the extraction and names the rule that chose it
    And an input that names a route, a stage list or a step list is refused
    And an extraction value outside its vocabulary is refused

  # AC-0001-0211-02
  Scenario: The first decision rule that holds decides the route
    Given an extraction that more than one decision rule could read
    When the core decides the route
    Then the route is the one the lowest-numbered rule that holds gives

  # AC-0001-0211-03
  Scenario: Every extraction reaches exactly one route
    Given every combination of intent, entry flags, qualifiers and signals the rules read
    When each is decided
    Then each reaches exactly one catalog route
    And an extraction no rule holds for routes the question route that changes nothing

  # AC-0001-0211-04
  Scenario: An unreadable request changes nothing
    Given an extraction with no intent
    When the core decides the route
    Then `plan` returns the route that investigates and answers
    And no tracked file changes

  # AC-0001-0211-05
  Scenario: qfai-run extracts facts and never names a route
    Given the routing reference `qfai-run` ships
    When `qfai-run` routes a request
    Then it submits an extraction whose every value the reference defines
    And it names no route to the core or to the operator

  # AC-0001-0211-06
  Scenario: One route gives one plan
    Given two different requests the core routes to the same route
    When their plans are issued
    Then both runs issue the same stages and steps in the same order
```
