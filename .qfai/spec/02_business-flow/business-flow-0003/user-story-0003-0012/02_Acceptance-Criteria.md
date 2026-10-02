# Acceptance Criteria

## Criteria

```gherkin
Feature: Doctor failure threshold
  # AC-0003-0012-01
  Scenario: A warning passes under --fail-on error
    Given doctor checks detect only warnings
    When `qfai doctor --fail-on error` runs
    Then the exit code is 0

  # AC-0003-0012-02
  Scenario: A warning fails under --fail-on warning
    Given doctor checks detect a warning
    When `qfai doctor --fail-on warning` runs
    Then the exit code is 1

  # AC-0003-0012-03
  Scenario: An error alone fails --fail-on warning
    Given doctor detects an error and no warning
    When `qfai doctor --fail-on warning` runs
    Then the exit code is 1

  # AC-0003-0012-04
  Scenario: An omitted --fail-on follows the configured threshold
    Given `qfai.config.yaml` leaves `validation.failOn` at its shipped default `error`, and doctor detects an error
    When `qfai doctor` runs without `--fail-on`
    Then the exit code is 1
    And with `--fail-on never` the same tree exits 0
```
