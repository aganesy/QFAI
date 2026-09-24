# Acceptance Criteria

## Criteria

```gherkin
Feature: Copilot repository instructions from init

# AC-0001-0029-01
# Parent: US-0001-0029
Scenario: Init creates the Copilot repository instructions entry point
  Given a project without `.github/copilot-instructions.md`
  When `qfai init` runs
  Then it creates the file with the shipped QFAI repository instructions

# AC-0001-0029-02
# Parent: US-0001-0029
Scenario: Init preserves an existing Copilot instructions file
  Given a project with an adopter-authored `.github/copilot-instructions.md`
  When `qfai init` runs without `--force`
  Then the adopter-authored content remains present
```
