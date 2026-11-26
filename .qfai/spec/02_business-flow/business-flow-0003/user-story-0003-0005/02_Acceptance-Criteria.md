# Acceptance Criteria

## Criteria

```gherkin
Feature: JSON diagnosis output
  # AC-0003-0005-01
  Scenario: The diagnosis is printed as JSON
    Given `qfai.config.yaml` exists
    When `qfai doctor --format json` runs
    Then root, config, checks and summary are printed as JSON

  # AC-0003-0005-02
  Scenario: `--out` writes the diagnosis to a file
    Given the doctor checks complete
    When `qfai doctor --out <file>` runs
    Then the diagnosis is written to `<file>`
    And a relative output path resolves against the checked project root
    And a dry run still writes an explicitly requested diagnosis while leaving the planned repairs unapplied
```
