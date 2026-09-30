# Acceptance Criteria

## Criteria

```gherkin
Feature: Declared screen evidence validation
  # AC-0001-0040-01
  Scenario: Missing screenshot evidence raises QFAI-UIE-001
    Given a declared screen has no screenshot evidence
    When the UI evidence validator runs
    Then `QFAI-UIE-001` fires when a declared screen is missing screenshot evidence.

  # AC-0001-0040-02
  Scenario: Missing HTML snapshot evidence raises QFAI-UIE-002
    Given a declared screen has no HTML snapshot evidence
    When the UI evidence validator runs
    Then `QFAI-UIE-002` fires when a declared screen is missing HTML snapshot evidence.

  # AC-0001-0040-03
  Scenario: No screen contract means no UI evidence finding
    Given no screen contract exists
    When the UI evidence validator runs
    Then the UI evidence validator skips without error.
```
