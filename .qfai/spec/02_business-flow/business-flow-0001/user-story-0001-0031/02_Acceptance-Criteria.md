# Acceptance Criteria

## Criteria

```gherkin
Feature: Forced update of instructions files
  # AC-0001-0031-01
  Scenario: `--force` regenerates the instructions files
    Given both instructions files exist with custom content
    When `qfai init --force` runs
    Then both files are regenerated from the shipped templates

  # AC-0001-0031-02
  Scenario: `--force` removes only old staging files init wrote
    Given `.github/instructions/` holds files named like init staging files
    When `qfai init --force` runs
    Then a file is removed only when its name is exactly a staging name init writes and it is over an hour old
    And every other file there is unchanged
```
