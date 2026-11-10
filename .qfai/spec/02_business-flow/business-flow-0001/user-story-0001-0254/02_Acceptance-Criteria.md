# Acceptance Criteria

## Criteria

```gherkin
Feature: Answer the costly decisions of a grilling round first
  # AC-0001-0254-01
  Scenario: A round is ordered by the cost of a wrong answer
    Given a grilling round put to the user whose frontier holds decisions of different cost
    When the agent puts the round
    Then a decision that is hard to reverse, or that later decisions hang on, comes before one that is cheap to revise
    And a question that depends on another still waits for a later round

  # AC-0001-0254-02
  Scenario: Cheap decisions share one grouped question
    Given decisions on the frontier that are cheap to revise later
    When the agent puts the round
    Then their recommendations share one question after the costly ones, each with its recommended answer and reason
    And the user accepts every recommendation in one answer or names the items to decide separately, and a named item is asked as its own question in the next round
    And a critical decision, a fact and a decision some document requires the user to record are never grouped

  # AC-0001-0254-03
  Scenario: Grouping is not delegation
    Given a user session
    When the user accepts a grouped question
    Then each item is recorded as the user's decision
    And the agent accepts no decision on the user's behalf, and a delegated session's rounds keep their own rules
```
