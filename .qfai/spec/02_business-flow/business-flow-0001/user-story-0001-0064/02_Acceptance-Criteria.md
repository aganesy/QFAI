# Acceptance Criteria

## Criteria

```gherkin
Feature: validate.json input
  # AC-0001-0064-01
  Scenario: A missing validate.json is an error
    Given `validate.json` does not exist
    When `qfai report` runs
    Then the error message "qfai report: input file not found" is shown
    And it exits with code 2
```
