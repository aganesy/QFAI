# Acceptance Criteria

## Criteria

```gherkin
Feature: Seed a diagnosed missing example under an existing criterion

# AC-0001-0213-01
# Parent: US-0001-0213
Scenario: A missing-example diagnosis becomes one example cited by one rule
  Given an sdd_append work order whose diagnosis names a case that no example of the bound flow states, and the AC it matched
  When defect example seeding runs
  Then exactly one EX is appended to the 03_Example.md of the story that owns that AC, citing that AC
  And the contract rule that already cites an example of that AC gains the new EX ID in its Examples cell
  And the flow's SDD evidence records the diagnosed defect and the run ID

# AC-0001-0213-02
# Parent: US-0001-0213
Scenario: Seeding changes no story, criterion, rule statement or existing example, and writes no test
  Given a flow whose matched AC already has an example that a test annotates
  When defect example seeding appends the new EX
  Then no US or AC is added or changed, no BR Statement changes, and no existing EX changes
  And seeding writes and annotates no test, so the new EX is an item of the obligation set that no test annotates

# AC-0001-0213-03
# Parent: US-0001-0213
Scenario: The appended example is recorded as an approval-free triage row
  Given defect example seeding appended an EX
  When the stage records the change
  Then decisions.md gains one triage row naming UPDATE:APPEND, the story and the diagnosis as its source
  And the row cites no human_decision, since the operation needs no approval
```
