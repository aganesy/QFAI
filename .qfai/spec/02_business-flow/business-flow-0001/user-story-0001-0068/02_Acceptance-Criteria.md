# Acceptance Criteria

## Criteria

```gherkin
Feature: Flow-scoped report

# AC-0001-0068-01
# Parent: US-0001-0068
Scenario: --flow scopes the report to named business flows
  Given the story tree
  And `validate.flow-<ids>.json` written by `qfai validate --flow BF-NNNN`
  When `qfai report --flow BF-NNNN` runs for the same flows
  Then the report is rendered from `validate.flow-<ids>.json` to `report.flow-<ids>.md`, or to `report.flow-<ids>.json` with `--format json`
  And only the named flows' reports under `<outDir>/business-flow-NNNN/` are written
  And report.md and report.json are left untouched

# AC-0001-0068-02
# Parent: US-0001-0068
Scenario: --spec is refused on the story tree
  Given the story tree
  When `qfai report --spec <spec-id>` runs
  Then it exits 2
  And its message names `--flow BF-NNNN` as the option that scopes a report on the story tree

# AC-0001-0068-03
# Parent: US-0001-0068
Scenario: A malformed --flow value writes no report
  Given the story tree
  When `qfai report --flow <value>` runs with a value that is not a `BF-NNNN` ID
  Then it exits 2
  And no report file is written
```
