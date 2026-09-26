# Acceptance Criteria

## Criteria

```gherkin
Feature: Stage 1 checks a routing-time CREATE approval instead of asking

# AC-0001-0212-01
# Parent: US-0001-0212
Scenario: A fresh, matching human decision approves the CREATE triage row
  Given an SDD work order whose target is a new_story slot and whose authorizationRefs cite a human_decision answering that slot's create question
  And the decision matches the triage row's operation and the slot it creates, and is not stale
  When Stage 1 triages the row
  Then Stage 1 does not put the CREATE question again
  And the attempt that writes the stage's change appends the CREATE row to decisions.md already at WIP, with an Approach citing the record as runId/authorizationId and naming its answeredBy
  And decisions.md keeps its four columns

# AC-0001-0212-02
# Parent: US-0001-0212
Scenario: A missing, mismatched or stale approval stops Stage 1
  Given a CREATE triage row whose cited human_decision is missing, does not match the row, or is stale
  When Stage 1 triages the row
  Then no triage row is appended
  And the stage returns awaiting_input naming the row and the reason
  And Stage 1 asks the operator nothing itself

# AC-0001-0212-03
# Parent: US-0001-0212
Scenario: A routing-time approval answers only a CREATE
  Given a DELETE, SPLIT, MERGE, SUPERSEDE or UPDATE:REMOVE triage row inside a run
  When Stage 1 triages the row
  Then no routing-time CREATE approval is cited for it
  And Stage 1 asks once and appends nothing: the stage result opens the approval question as a decision question with outcome awaiting_input
  And the attempt holding the human_decision appends the row already at WIP, with an Approach citing that answer

# AC-0001-0212-04
# Parent: US-0001-0212
Scenario: --auto neither asks nor approves
  Given an approval-required triage row with no human_decision that answers it
  When Stage 1 runs under --auto, inside a run or outside one
  Then Stage 1 asks no question and the row does not reach WIP
  And it stops before every write that depends on the row and reports the row with its operation and target
```
