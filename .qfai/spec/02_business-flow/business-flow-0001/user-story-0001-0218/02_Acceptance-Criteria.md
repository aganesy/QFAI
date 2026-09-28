# Acceptance Criteria

## Criteria

```gherkin
Feature: Route a request through a fixed decision table
  # AC-0001-0218-01
  Scenario: The routing result carries facts and the core decides the route
    Given a routing result whose proposal carries an extraction
    When `accept` checks it
    Then the core decides the route from the extraction and records the rule that chose it
    And a proposal that names a route, a stage list or a step list is refused
    And an extraction value outside its vocabulary is refused

  # AC-0001-0218-02
  Scenario: The first decision rule that holds decides the route
    Given an extraction that more than one decision rule could read
    When the core decides the route
    Then the route is the one the lowest-numbered rule that holds gives

  # AC-0001-0218-03
  Scenario: Every extraction reaches exactly one route
    Given every combination of intent, entry flags, qualifiers and signals the rules read
    When each is decided
    Then each reaches exactly one catalog route
    And an extraction no rule holds for routes the question route that changes nothing

  # AC-0001-0218-04
  Scenario: An unreadable request changes nothing
    Given an extraction with no intent
    When the core decides the route
    Then the run takes the route that investigates and answers
    And no tracked file changes

  # AC-0001-0218-05
  Scenario: qfai-run extracts facts and never names a route
    Given the routing reference `qfai-run` ships
    When `qfai-run` routes a request
    Then it submits an extraction whose every value the reference defines
    And it names no route to the core or to the operator

  # AC-0001-0218-06
  Scenario: One route gives one plan
    Given two different requests the core routes to the same route
    When their plans are issued
    Then both runs issue the same stages and steps in the same order
```
