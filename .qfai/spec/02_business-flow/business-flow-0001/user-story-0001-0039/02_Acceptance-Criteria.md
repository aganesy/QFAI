# Acceptance Criteria

## Criteria

```gherkin
Feature: Deterministic validation gate
  # AC-0001-0039-01
  Scenario: Validate runs the deterministic validators and aggregates their issues
    Given a QFAI project
    When `qfai validate` runs
    Then `qfai validate` runs deterministic validators and aggregates issues.
```
