# Acceptance Criteria

## Criteria

```gherkin
Feature: Instructions activation guidance
  # AC-0001-0032-01
  Scenario: Creating an instructions file prints activation guidance
    Given a new repository with no instructions files
    When `qfai init` runs
    And at least one instructions file is created
    Then stdout shows activation guidance
```
