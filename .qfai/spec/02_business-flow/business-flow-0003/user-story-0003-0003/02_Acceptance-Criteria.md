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
    When `qfai doctor` runs
    Then the `paths.srcDir`, `paths.testsDir` and `paths.outDir` checks are reported at info, each with one line saying why
    And the `output.validateJson` check is reported at info
    And a `srcDir`, `testsDir` or `outDir` that is not the shipped default and does not exist is still reported as a warning
    And a shipped-default `srcDir`, `testsDir` or `outDir` that is a broken link, and a `validate.json` that is not a readable file, are reported as a warning

  # AC-0003-0003-03
  Scenario: Validate reports an absent shipped-default source or tests directory at info
    Given a project whose `paths.srcDir` and `paths.testsDir` are the shipped defaults and do not exist
    When `qfai validate` runs
    Then `QFAI-CFG-LINK-002` is raised at info for each, with one line saying why and no repair to make
    And it is raised at warning for a `srcDir` or `testsDir` that is not the shipped default and does not exist, or whose default name is taken by a file or a broken link
    And `paths.outDir` is not checked
```
