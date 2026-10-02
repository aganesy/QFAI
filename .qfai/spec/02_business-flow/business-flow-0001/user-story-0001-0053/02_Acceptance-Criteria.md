# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question table validation
  # AC-0001-0053-01
  Scenario: A table with the wrong columns is reported
    Given the story tree, and a `decisions.md` or `open-questions.md` table that has a column other than ID, Content, Approach and Status, or lacks one of those four
    When `qfai validate --profile sdd` runs
    Then an error names the file and the column

  # AC-0001-0053-02
  Scenario: A Status outside the vocabulary is reported
    Given the story tree, and a row whose Status is outside its table's vocabulary — TODO, WIP or DONE in both tables, plus `SUPERSEDED (by DEC-NNNN)` and REJECTED in `decisions.md`, and DEFERRED in `open-questions.md`
    When `qfai validate --profile sdd` runs
    Then an error names the file and the row ID
    And a SUPERSEDED Status not written as `SUPERSEDED (by DEC-NNNN)` is outside the vocabulary

  # AC-0001-0053-03
  Scenario: A row ID of the other table's shape is reported
    Given the story tree, and a `decisions.md` row whose ID has the `OQ-NNNN` shape, or an `open-questions.md` row whose ID has the `DEC-NNNN` shape
    When `qfai validate --profile sdd` runs
    Then an error names the file and the row ID

  # AC-0001-0053-04
  Scenario: A keyword row is in force by its Status alone
    Given the story tree, and a table row whose Content cell opens with `Test exception:`, `Change request:` or `Unadjudicated:`
    When a validator that reads that keyword runs
    Then it reads the IDs or paths after the colon, separated by commas, as the row's references
    And it decides whether the row is in force from the Status cell alone: `Test exception:` while DONE, `Change request:` while WIP or DONE, `Unadjudicated:` while TODO or WIP

  # AC-0001-0053-05
  Scenario: An open Unadjudicated question raises QFAI-SPACK-102
    Given the story tree, and an `open-questions.md` row opening `Unadjudicated:` with Status TODO or WIP
    When `qfai validate --profile sdd` runs
    Then `QFAI-SPACK-102` is raised at error naming the file and the row ID
    And the same row at DONE or DEFERRED raises no such finding
```
