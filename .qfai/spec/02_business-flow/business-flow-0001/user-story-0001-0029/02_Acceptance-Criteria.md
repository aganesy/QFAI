# Acceptance Criteria

## Criteria

```gherkin
Feature: Copilot instructions generation
  # AC-0001-0029-01
  Scenario: Init creates the Copilot repository instructions entry point
    Given a project without `.github/copilot-instructions.md`
    When `qfai init` runs
    Then it creates the file with the shipped QFAI repository instructions

  # AC-0001-0029-02
  Scenario: Init preserves an existing Copilot instructions file
    Given a project with an adopter-authored `.github/copilot-instructions.md`
    When `qfai init` runs without `--force`
    Then the adopter-authored content remains present

  # AC-0001-0029-04
  Scenario: A forced init keeps the project entries in the Copilot instructions
    Given a project whose `.github/copilot-instructions.md` has a rule-list entry and a section the shipped text does not have
    When `qfai init --force` runs
    Then the file holds the shipped text with that entry and that section
    And init names each line it changed or removed, and names none when it removed none
```
