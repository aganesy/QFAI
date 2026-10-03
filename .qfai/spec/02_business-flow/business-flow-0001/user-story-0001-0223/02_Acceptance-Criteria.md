# Acceptance Criteria

## Criteria

```gherkin
Feature: Answer only the critical decisions, and approve each release
  # AC-0001-0223-01
  Scenario: A critical decision at a decision point is asked before the step goes on
    Given a step the plan marks as a decision point
    When it reaches a decision that contradicts a specification, a contract or a recorded decision, cannot be taken back, or rests on product intent nothing written states
    Then the session asks the user through the structured question tool
    And the step changes nothing until the user answers

  # AC-0001-0223-02
  Scenario: Any other decision is taken and reported
    Given a decision point that reaches a decision that is not critical
    When the step decides it
    Then nothing is asked
    And the final report lists the decision and its reason

  # AC-0001-0223-03
  Scenario: A release point always asks
    Given a route whose plan names a release point
    When the work reaches it
    Then the user is asked to approve the release
    And nothing after the release point runs without that approval
    And the approval authorizes no push, merge, tag or publication

  # AC-0001-0223-04
  Scenario: An approval is one decisions row
    Given the user approves a specification change, a critical decision or a release
    When the approval is recorded
    Then `decisions.md` gains one row naming what was approved, who approved it, when, and the option chosen
    And no row records a decision the agent took

  # AC-0001-0223-05
  Scenario: With no questions allowed, a critical decision waits as an open question
    Given a no-question mode such as `--auto`
    When a critical decision or a release point is reached
    Then nothing is asked
    And an `open-questions.md` row names the decision
    And the step stops before the change that depends on it
```
