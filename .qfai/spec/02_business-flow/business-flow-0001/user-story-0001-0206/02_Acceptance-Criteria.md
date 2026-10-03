# Acceptance Criteria

## Criteria

```gherkin
Feature: Seed a diagnosed missing example under an existing criterion
  # AC-0001-0206-01
  Scenario: A missing-example diagnosis becomes one example cited by one rule
    Given an append stage whose diagnosis names a case that no example of the flow states, and the AC it matched
    When defect example seeding runs
    Then exactly one EX is appended to the 03_Example.md of the story that owns that AC, citing that AC
    And the contract rule that already cites an example of that AC gains the new EX ID in its Examples cell

  # AC-0001-0206-02
  Scenario: Seeding changes no story, criterion, rule statement or existing example, and writes no test
    Given a flow whose matched AC already has an example that a test annotates
    When defect example seeding appends the new EX
    Then no US or AC is added or changed, no BR Statement changes, and no existing EX changes
    And seeding writes and annotates no test, so the new EX is an item of the obligation set that no test annotates

  # AC-0001-0206-03
  Scenario: The appended example records no decision row
    Given defect example seeding appended an EX
    When the stage finishes
    Then decisions.md gains no row, since the operation needs no approval
```
