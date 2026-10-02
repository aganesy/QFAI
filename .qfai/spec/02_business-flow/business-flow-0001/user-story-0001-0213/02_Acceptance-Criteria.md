# Acceptance Criteria

## Criteria

```gherkin
Feature: Stop for me when the router is unsure
  # AC-0001-0213-01
  Scenario: A low-confidence request asks which route to take
    Given an extraction at low confidence with its alternative readings
    When the core decides the route
    Then routing ends waiting for one single-select question listing the two or three candidate routes, the main reading's recommended
    And the run carries `gate:user` and `review:heavy`

  # AC-0001-0213-02
  Scenario: Candidates that differ in their gates ask even at medium confidence
    Given an extraction at medium confidence whose alternatives lead to routes with different gate modifiers
    When the core decides the route
    Then routing asks which route to take and the run carries `gate:user`

  # AC-0001-0213-03
  Scenario: A request that reads one way asks nothing about its route
    Given an extraction at high confidence, or at medium confidence with no candidate differing in its gates
    When the core decides the route
    Then the main reading's route is taken with no question and no added modifier

  # AC-0001-0213-04
  Scenario: Without questions the earliest candidate is taken with every candidate's modifiers
    Given a low-confidence extraction under a no-question mode
    When the core decides the route
    Then no question is put
    And the candidate the decision rules reach first is taken, with the union of all candidates' modifiers
    And the completion report lists the choice as an assumption

  # AC-0001-0213-05
  Scenario: The route taken is never lighter than a candidate
    Given the candidates of an unsure request
    When the run's route and modifiers are fixed
    Then the run carries every modifier any candidate would have carried

  # AC-0001-0213-06
  Scenario: The candidate question says what each route will do
    Given the candidate question the core opens
    When `qfai-run` puts it to the operator
    Then each option says in plain words what that route will do, with no route identifier
    And the recommendation stands on a line of its own
```
