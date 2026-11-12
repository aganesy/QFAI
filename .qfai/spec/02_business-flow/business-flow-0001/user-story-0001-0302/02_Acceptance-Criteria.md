# Acceptance Criteria

## Criteria

```gherkin
Feature: Validate checks only the deliberation record's table layout
  # AC-0001-0302-01
  Scenario: A record in the six-column layout raises nothing
    Given a `*.md` record under `paths.deliberationDir` with an `Interview` and an `Agent decisions` section
    And every table in them has the header `Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number` and rows of six cells
    When `qfai validate` runs
    Then it raises no `QFAI-DELIB-001`, whatever the rows hold and however many options they fill

  # AC-0001-0302-02
  Scenario: A layout defect is an error
    Given a record that lacks one of the two sections, has a table header with a column missing, added, renamed or moved, or has a data row whose cell count is not six
    When `qfai validate` runs
    Then it raises `QFAI-DELIB-001` at error naming the file, the section and the column or row

  # AC-0001-0302-03
  Scenario: Nothing else about a record is checked
    Given a project with no record, or a record whose name, cell contents or option count is unusual
    When `qfai validate` runs
    Then it raises no `QFAI-DELIB-001` and no `QFAI-DOCSCHEMA-001` for the record

  # AC-0001-0302-04
  Scenario: The profiles that run the layout check
    Given a record with a layout defect
    When `qfai validate` runs each profile
    Then `discussion`, `sdd`, `full` and `verify` raise `QFAI-DELIB-001`, and the other profiles do not

  # AC-0001-0302-05
  Scenario: The record directory comes from the configuration
    Given `qfai.config.yaml` with or without `paths.deliberationDir`
    When `qfai validate` runs
    Then it reads the records under the configured directory, or under `.qfai/deliberation` when the key is absent
```
