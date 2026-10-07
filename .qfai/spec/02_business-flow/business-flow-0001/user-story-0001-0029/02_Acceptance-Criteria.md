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

  # AC-0001-0029-03
  Scenario: The generated Copilot instructions state the closed legacy window
    Given an empty project directory
    When `qfai init` runs
    Then the `.github/copilot-instructions.md` it writes says the legacy `.qfai/assistant/instructions/` layout is past its compatibility window and that `qfai init` reports it on stderr as a `QFAI-DEPRECATED-001` error, and names `qfai init --upgrade-assistant-tree`
    And it neither calls the legacy layout read-compatible nor calls the finding a warning
```
