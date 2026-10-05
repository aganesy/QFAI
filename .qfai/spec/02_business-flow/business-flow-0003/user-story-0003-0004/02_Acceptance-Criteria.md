# Acceptance Criteria

## Criteria

```gherkin
Feature: Legacy layout and leftover paths
  # AC-0003-0004-01
  Scenario: A legacy file layout is warned about
    Given a legacy file layout is detected
    When `qfai doctor` runs
    Then a legacy warning is shown

  # AC-0003-0004-02
  Scenario: Leftover paths are listed and none is deleted
    Given a project holding paths an earlier release wrote and this release no longer uses
    When `qfai doctor` runs, with or without `--clean` or `--autoremediate`
    Then the `paths.leftovers` check is `info` and lists each of those paths
    And every listed path remains on disk

  # AC-0003-0004-03
  Scenario: The migration folder is marked separately
    Given a project holding `.qfai/evidence/migration-spec-to-story/`
    When `qfai doctor` runs
    Then the folder is named on its own line, which says it may hold the only copy of content the 1.x migration retired and that the adopter decides whether to delete it

  # AC-0003-0004-04
  Scenario: No leftover path is present
    Given a project holding none of those paths
    When `qfai doctor` runs
    Then the `paths.leftovers` check is `ok`

  # AC-0003-0004-05
  Scenario: Assistant files older than the CLI are warned about
    Given an assistant file names a `qfai workflow` operation this release does not have
    When `qfai doctor` runs
    Then the `assistant.staleFiles` check is a `warning` that lists the file and names `npx qfai init --force`
    And the file is unchanged

  # AC-0003-0004-06
  Scenario: Current assistant files are not reported
    Given no assistant file names such an operation, or the project has no assistant files
    When `qfai doctor` runs
    Then no `assistant.staleFiles` check is reported
```
