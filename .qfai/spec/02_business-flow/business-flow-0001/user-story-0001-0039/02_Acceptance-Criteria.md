# Acceptance Criteria

## Criteria

```gherkin
Feature: Deterministic validation gate
  # AC-0001-0039-01
  Scenario: Validate runs the deterministic validators and aggregates their issues
    Given a QFAI project
    When `qfai validate` runs
    Then `qfai validate` runs deterministic validators and aggregates issues.

  # AC-0001-0039-02
  Scenario: A UI/UX group over its budget says which validator is slow and that the budget is not a gate
    Given a project whose UI/UX validators take longer than their budget
    When `qfai validate` runs with the text output
    Then the `timings:` line names the two slowest validators of the group with their time
    And the line says that the budget is a target, not a gate, and no finding is raised for it
```
