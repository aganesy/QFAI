# Acceptance Criteria

## Criteria

```gherkin
Feature: Forced update of instructions files
  # AC-0001-0031-01
  Scenario: `--force` regenerates the instructions files
    Given both instructions files exist with custom content
    When `qfai init --force` runs
    Then both files are regenerated from the shipped templates
```
