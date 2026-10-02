# Acceptance Criteria

## Criteria

```gherkin
Feature: Grouped doctor output and a skills.integrity downgrade
  # AC-0003-0007-01
  Scenario: skills.integrity defaults to warning
    Given the `skills.integrity` check detects drift
    When `qfai doctor` runs
    Then the finding severity is `warning` (the default)
    And exit 0 holds even with `--fail-on error`, because `skills.integrity` alone does not block the active profile
    And with `--fail-on warning`, `skills.integrity` drift alone ends with exit 1

  # AC-0003-0007-02
  Scenario: The doctor summary is split into two groups
    Given doctor outputs a mix of errors and warnings
    When `qfai doctor --format text` runs
    Then the summary prints an "errors blocking the active profile" group and a "warnings advisory of drift" group separately
    And a `skills.integrity` finding appears in the "warnings advisory of drift" group whatever its wording
```
