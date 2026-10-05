# Acceptance Criteria

## Criteria

```gherkin
Feature: Run-log prune under --clean
  # AC-0003-0008-04
  Scenario: `--clean` prunes expired validate run logs
    Given validate run logs under the configured output directory, some older than `report.staleTtlDays`
    When `qfai doctor --clean` runs
    Then each expired run outside the newest `report.keepLatestRuns` is removed and the newest runs stay
    And no run is removed when the config has issues or another project root shares the output directory
```
