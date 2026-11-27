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
    Given `qfai doctor --out <file>` is requested
    When doctor builds a diagnosis
    Then doctor writes it to `<file>`
    And a relative output path resolves against the checked project root
    And a dry run that builds a diagnosis writes it while leaving the planned repairs unapplied
```
