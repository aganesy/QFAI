# Acceptance Criteria

## Criteria

```gherkin
Feature: Preflight needs a usable source
  # AC-0001-0148-01
  Scenario: No usable source stops SDD
    Given no deliberation record of the run or named in the work order, no import-lite input and no explicit user requirement is usable
    When SDD starts
    Then it stops and guides the operator to /qfai-discussion

  # AC-0001-0148-03
  Scenario: A record with open or contradictory answers remains provenance
    Given a deliberation record that leaves questions open or contradicts itself
    When SDD starts
    Then it continues using that record as non-normative reference material
    And it states the discrepancy in its final report or as an open question
    And it does not edit the record to clear the discrepancy
```
