# Acceptance Criteria

## Criteria

```gherkin
Feature: Convergence and iteration budget
  # AC-0001-0101-01
  Scenario: The machine gate is documented
    Given a prototyping run approaches completion
    When the skill documents its machine gate
    Then `qfai validate --fail-on error` is documented as the machine gate before completion.

  # AC-0001-0101-02
  Scenario: The final review gate is documented
    Given a prototyping run approaches final review
    When the skill documents its review gate
    Then `/qfai-verify` is documented as the final review gate.
    And completion remains blocked on `REVISE`.

  # AC-0001-0101-03
  Scenario: A time-budget overrun is a soft warning
    Given the time-budget cap is 5 minutes per (UI contract, screen) review session in each cycle
    When a review session exceeds the cap in a cycle
    Then the reviewer payload records a `softWarnings.timeBudget` entry
    And the aggregator does not gate on it, and only the global 10-cycle budget can hard-fail the run
```
