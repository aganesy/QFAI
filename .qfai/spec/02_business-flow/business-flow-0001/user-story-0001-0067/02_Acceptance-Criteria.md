# Acceptance Criteria

## Criteria

```gherkin
Feature: Prototyping Observability Section
  # AC-0001-0067-01
  Scenario: The Prototyping section is written
    Given prototyping evidence exists
    When `qfai report --format md` runs
    Then report.md contains a `## Prototyping` section
    And it contains the mode, obligations, evidence coverage, render, browserQa and calibration subsections
    And a missing screenshot or HTML snapshot is judged from the validation findings and from the `{kind, path}` entries of `evidenceRefs[]` on each screen of the accepted iteration after convergence, without assuming the old per-iteration capture script or `QFAI-UIE-001/002`

  # AC-0001-0067-02
  Scenario: The Prototyping section without evidence
    Given no prototyping evidence exists
    When `qfai report --format md` runs
    Then report.md contains a `## Prototyping` section
    And it shows `Status: no-pack` and does not claim success for evidence that does not exist
```
