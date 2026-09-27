# Acceptance Criteria

## Criteria

```gherkin
Feature: Decision and open-question tables

# AC-0001-0007-01
# Parent: US-0001-0007
Scenario: The two tables carry four columns and their own status vocabulary
  Given a project on the story tree
  When `decisions.md` and `open-questions.md` are read
  Then each holds one table with exactly the columns ID, Content, Approach and Status
  And a `decisions.md` row has an ID of the form `DEC-NNNN` and a Status of TODO, WIP, DONE, `SUPERSEDED (by DEC-NNNN)` or REJECTED
  And an `open-questions.md` row has an ID of the form `OQ-NNNN` and a Status of TODO, WIP, DONE or DEFERRED

# AC-0001-0007-02
# Parent: US-0001-0007
Scenario: Table rows are only appended
  Given a row that `decisions.md` or `open-questions.md` already holds on the story tree
  When the table changes
  Then the row is still there with the same ID, Content and Approach
  And only its Status may differ
  And a new decision or question is a new row at the end of the table

# AC-0001-0007-03
# Parent: US-0001-0007
Scenario: Triage records, change requests and retired stories are decision rows
  Given a project on the story tree
  When a triage operation, a change request or a story retirement is recorded
  Then it is recorded as a row of `decisions.md`
  And no file is written under `.qfai/decisions/` and no `01_Spec-retired.md` file exists
```
