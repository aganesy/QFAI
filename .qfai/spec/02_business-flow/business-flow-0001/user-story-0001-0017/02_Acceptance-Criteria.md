# Acceptance Criteria

## Criteria

```gherkin
Feature: discussion-to-SDD handoff
  # AC-0001-0017-01
  Scenario: SDD consumes a deliberation record as source material
    Given the deliberation record of the run, or the one the work order names, and a completed review
    When `/qfai-sdd` prepares the story tree
    Then it reads every table of the record as source material
    And it states a discrepancy in its final report or as an open question rather than editing the record
    And invoked by name with no work order, it uses the record the user names, and asks which one when the user names none
```
