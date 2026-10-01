# Acceptance Criteria

## Criteria

```gherkin
Feature: Copilot review instructions distribution
  # AC-0001-0030-01
  Scenario: Init creates the Copilot review instructions
    Given a new repository with no `.github/instructions/` directory
    When `qfai init` runs
    Then `.github/instructions/code-review.instructions.md` and `principles.instructions.md` are created
    And each file carries YAML front matter

  # AC-0001-0030-02
  Scenario: An existing instructions file is left unchanged
    Given `.github/instructions/code-review.instructions.md` exists with custom content
    When `qfai init` runs
    Then the existing file is not changed
```
