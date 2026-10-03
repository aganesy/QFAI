# Acceptance Criteria

## Criteria

```gherkin
Feature: Directory structure diagnosis
  # AC-0003-0002-01
  Scenario: Directory structure diagnosis
    Given `paths.specsDir` is configured to a non-default path, and that directory does not exist
    When `qfai doctor` runs
    Then the `paths.specsDir` check reports the directory missing as a warning
```
