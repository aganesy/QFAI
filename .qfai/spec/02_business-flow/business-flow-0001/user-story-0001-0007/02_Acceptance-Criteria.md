# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question tables
  # AC-0001-0007-01
  Scenario: The two tables carry three columns and IDs of their own form
    Given a project on the story tree
    When `decisions.md` and `open-questions.md` are read
    Then each holds one table with exactly the columns ID, Content and Approach, and no Status column
    And a `decisions.md` row has an ID of the form `DEC-yyyymmddhhMMss`, the UTC time the row was written as 14 digits of a real calendar time, or of the legacy form `DEC-NNNN`
    And an `open-questions.md` row has an ID of the form `OQ-yyyymmddhhMMss` or of the legacy form `OQ-NNNN`
    And a row written in a UTC second that a row of its register already took takes the next second no row of that register holds

  # AC-0001-0007-02
  Scenario: A decision row is never removed or renumbered
    Given a row that the base's decision register holds
    When the branch changes the register
    Then the head's register holds a row with the same ID, matched by its ID wherever it sits, whose Content and Approach may be restated
    And a row the head adds may sit anywhere among the base's rows, as a union merge of two branches leaves them
    And a new decision is appended to the root Decisions table, and a new question to `open-questions.md`
    And a decision that replaces or narrows an earlier one is a new row whose Approach cites the earlier ID, and that ID is a row of the register

  # AC-0001-0007-03
  Scenario: Triage records and decisions the user made are decision rows
    Given a project on the story tree
    When a triage operation or a decision the user made that passes the recording test is recorded, or a story is retired
    Then a recorded decision is a row of `decisions.md`, and a retired story's directory is removed
    And no file is written under `.qfai/decisions/` and no `01_Spec-retired.md` file exists

  # AC-0001-0007-06
  Scenario: A question row lives while the question is open
    Given a row that the base's `open-questions.md` holds
    When the branch changes `open-questions.md`
    Then the head holds a row with the same ID, Content and Approach cells, or has deleted the row while a decision row or a question row of the head register names its ID
    And a question row is never edited
    And a question deferred after its row was written is deleted, and the same change appends a new question row whose Approach names the next decision point and says `Replaces OQ-…` with the deleted ID
    And a question row deleted while no decision row and no question row of the head register names it is an error

  # AC-0001-0007-07
  Scenario: A row a branch adds takes the timestamp form
    Given a branch that appends a row to `decisions.md` or `open-questions.md`
    When its rows are compared with the base
    Then each row the branch added has a timestamp ID
    And a branch-added row with a legacy `DEC-NNNN` or `OQ-NNNN` ID is an error, while the rows the base holds keep their legacy IDs
```
