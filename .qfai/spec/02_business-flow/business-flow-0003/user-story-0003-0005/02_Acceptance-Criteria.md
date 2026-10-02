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
    When `qfai doctor --format json --out /tmp/doctor.json` runs
    Then the diagnosis is written to `/tmp/doctor.json`
```
