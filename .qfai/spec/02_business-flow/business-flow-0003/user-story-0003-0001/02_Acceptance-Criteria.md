# Acceptance Criteria

## Criteria

```gherkin
Feature: Configuration file diagnosis
  # AC-0003-0001-01
  Scenario: The configuration file is found
    Given `qfai.config.yaml` exists
    When `qfai doctor` runs
    Then it reports `config.found = true`
    And it shows the configuration file path

  # AC-0003-0001-02
  Scenario: A missing configuration file is reported
    Given `qfai.config.yaml` does not exist
    When `qfai doctor` runs
    Then it reports `config.found = false`
    And it shows a warning message

  # AC-0003-0001-03
  Scenario: Invalid configuration
    Given `qfai.config.yaml` is present but its loader reports issues
    When `qfai doctor` runs
    Then the `config.load` check is `error`
    And `details.issues` lists the issues
```
