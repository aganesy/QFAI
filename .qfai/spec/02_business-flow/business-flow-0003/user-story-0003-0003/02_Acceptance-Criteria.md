# Acceptance Criteria

## Criteria

```gherkin
Feature: Path resolution diagnosis
  # AC-0003-0003-01
  Scenario: An unresolvable path is reported as a warning
    Given `testsDir` in `qfai.config.yaml` points to a path that is not the shipped default `tests` and does not exist
    When `qfai doctor` runs
    Then the path resolution failure is reported as a warning

  # AC-0003-0003-02
  Scenario: An absent shipped-default path is reported at info
    Given a project whose `paths.srcDir`, `paths.testsDir` and `paths.outDir` are the shipped defaults and do not exist, and whose `validate.json` has not been written
    When `qfai doctor` or `qfai validate` runs
    Then the `paths.srcDir`, `paths.testsDir` and `paths.outDir` checks and `QFAI-CFG-LINK-002` for `srcDir` and `testsDir` are reported at info, each with one line saying why
    And the `output.validateJson` check is reported at info
    And a `srcDir`, `testsDir` or `outDir` that is not the shipped default and does not exist is still reported as a warning
```
