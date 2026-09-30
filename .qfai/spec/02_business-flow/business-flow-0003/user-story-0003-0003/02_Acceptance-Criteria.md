# Acceptance Criteria

## Criteria

```gherkin
Feature: Path resolution diagnosis
  # AC-0003-0003-01
  Scenario: An unresolvable path is reported as a warning
    Given `testsDir` in `qfai.config.yaml` points to a path that does not exist
    When `qfai doctor` runs
    Then the path resolution failure is reported as a warning
```
