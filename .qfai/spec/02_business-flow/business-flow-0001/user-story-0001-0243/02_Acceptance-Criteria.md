# Acceptance Criteria

## Criteria

```gherkin
Feature: Every shipped checker script has a caller

  # AC-0001-0243-01
  Scenario: Fail on a shipped script no one runs
    Given the scripts in the package's shipped scripts directory
    When the package tests run
    Then each script run as a node command by a shipped step, skill, rule or GitHub Actions workflow passes, and each other script fails the test by name
```
