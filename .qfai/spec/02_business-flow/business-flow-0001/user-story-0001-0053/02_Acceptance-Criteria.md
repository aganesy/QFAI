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
    Given the story tree, and a row whose Status is outside its table's vocabulary — TODO, WIP or DONE in both tables, plus `SUPERSEDED (by DEC-NNNN)`, `PARTLY SUPERSEDED (by DEC-NNNN)` and REJECTED in `decisions.md`, and DEFERRED in `open-questions.md`
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

  # AC-0001-0053-06
  Scenario: A cited decision or question that no row declares is reported
    Given the story tree, and a contract rule whose statement cites a `DEC-NNNN` or `OQ-NNNN` that no row declares, or a `decisions.md` row at `SUPERSEDED (by DEC-NNNN)` whose successor no row declares
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-003` is raised at error naming the file, the citing rule or row, and the missing ID
  # AC-0001-0053-07
  Scenario: A document that states a term the project lists as stale is reported
    Given the story tree, and `validation.staleTerms` in `qfai.config.yaml` listing a term that a document under `paths.specsDir` or `paths.contractsDir` states
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-016` is raised at warning naming the file, the line and the term
    And `decisions.md` and `open-questions.md` are not read
    And with no term listed, nothing is checked
  # AC-0001-0053-08
  Scenario: A decision row whose Approach cell breaks the four-item form is reported
    Given the story tree, and a `decisions.md` row above `DEC-2097` whose Approach cell lacks, empties or reorders `Evidence:`, `Grounds:`, `Residual risk:` or `Rollback:`, takes `none — <reason>` outside the last two, or holds an Evidence entry that is neither `file:` nor `command:`
    When `qfai validate --profile sdd` runs
    Then `QFAI-STORY-017` is raised at error naming the file, the row ID and the breach
    And a row up to `DEC-2097` is not read
```
