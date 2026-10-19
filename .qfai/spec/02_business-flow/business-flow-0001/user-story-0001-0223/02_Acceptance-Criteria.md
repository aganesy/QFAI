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
    And outside the discussion stage no grilling record is written

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

  # AC-0001-0223-06
  Scenario: A step with no open design decision starts no griller
    Given a step that meets no design decision the request needs and the repository cannot settle, such as an operation, a routine step, applying a settled decision, or a fix whose expected behaviour the story tree states
    When the step runs
    Then no griller starts and no grilling session is held
    And the agent decides from what is written, and the final report lists nothing for the user
    And a step that meets such a decision outside the discussion stage still holds a delegated session, and a critical decision still goes to the user
    And the grilling rule and its reminders say when a session is held and when none is

  # AC-0001-0223-07
  Scenario: The final report states the policy check
    Given a run of any route
    When the final report is written
    Then it says whether `common-policy-check` ran and its outcome, or that it did not run and why
    And it lists each plan step and planned review with its status and, for every status but ran, the reason
```
