# Acceptance Criteria

## Criteria

```gherkin
Feature: Output path control
  # AC-0001-0063-01
  Scenario: --out sets the output path
    Given `validate.json` exists
    When `qfai report --out /tmp/custom-report.md` runs
    Then the report is written to `/tmp/custom-report.md`
```
