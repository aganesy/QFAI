# Acceptance Criteria

## Criteria

```gherkin
Feature: Grouped doctor output
  # AC-0003-0007-02
  Scenario: The doctor summary is split into two groups
    Given doctor outputs a mix of errors and warnings
    When `qfai doctor --format text` runs
    Then the summary prints an "errors blocking the active profile" group and a "warnings advisory of drift" group separately
    And each `error` finding is in the first group and each `warning` or `info` finding in the second
```
