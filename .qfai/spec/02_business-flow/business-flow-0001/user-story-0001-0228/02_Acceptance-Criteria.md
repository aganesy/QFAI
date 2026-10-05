# Acceptance Criteria

## Criteria

```gherkin
Feature: Finish prototyping when I confirm the prototype
  # AC-0001-0228-01
  Scenario: The user's confirmation completes prototyping
    Given a prototype the loop has reviewed
    When the user confirms it
    Then the handoff step runs
    And no command or check certifies the completion
    And a blocking finding still open at the confirmation is named in the final report

  # AC-0001-0228-02
  Scenario: Until the user confirms, the loop goes on
    Given a reviewed prototype
    When the user asks for a change instead of confirming
    Then the loop runs another iteration
    And the handoff step does not run

  # AC-0001-0228-03
  Scenario: The prototype's files stay in the prototype folder
    Given a prototyping session
    When it writes the prototype, its reviews and the handoff
    Then each is under `.qfai/prototype/`
```
