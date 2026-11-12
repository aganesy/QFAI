# Acceptance Criteria

## Criteria

```gherkin
Feature: Agents read deliberation records only where they must
  # AC-0001-0299-01
  Scenario: The current state comes from the registers
    Given a deliberation record and the story tree, `decisions.md` and `open-questions.md`
    When an agent needs the current specification, a settled decision or an open question
    Then it reads the story tree and the two registers, and no record
    And where a record disagrees with them, the registers win and the record is left unchanged
    And an implement, verify or prototyping stage reads no record

  # AC-0001-0299-02
  Scenario: A turned-down option is looked up before an agent decides
    Given an agent about to take a decision itself
    When it checks whether one of its options was turned down before
    Then it reads the `Declined:` rows of `decisions.md` and searches the option cells of the records
    And it reads only the rows the search matches, never a whole record

  # AC-0001-0299-03
  Scenario: The record template warns against reading it as the current state
    Given a project initialised by `qfai init`
    When an agent opens the shipped deliberation record template
    Then its opening note says the record is history, holds twists, is not the current state and is not read end to end
```
