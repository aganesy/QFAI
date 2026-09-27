# Acceptance Criteria

## Criteria

```gherkin
Feature: Idempotent initialization
  # AC-0001-0021-01
  Scenario: A repeated init skips existing files
    Given `.qfai/` and `qfai.config.yaml` already exist
    When `qfai init` runs again
    Then existing files are skipped and only new files are added
    And the skipped files are reported on the console
```
