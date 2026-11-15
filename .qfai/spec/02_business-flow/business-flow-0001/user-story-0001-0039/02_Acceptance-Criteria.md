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

  # AC-0001-0039-03
  Scenario: The instruction audit reports instruction text an agent reads badly
    Given a project whose assistant tree, root rules or entry files hold capitalised emphasis or "think hard" phrasing, a long SKILL.md, a long skill listing or a large AGENTS.md
    When `qfai validate` runs the `verify` or `full` profile
    Then each is reported at warning, naming the file and the limit it exceeds
    And the files `qfai init` writes raise none of them

  # AC-0001-0039-04
  Scenario: Validate reads the surface kind of each UI contract screen
    Given a UI contract whose screens declare `surface` or leave it out
    When `qfai validate` runs the contract checks
    Then a screen that writes no `surface`, leaves it empty, or writes `application` or `marketing` raises nothing, and one that writes none is an application screen
    And any other value raises `QFAI-CONTRACT-051` at error, naming the contract, the screen, the value and the vocabulary

  # AC-0001-0039-05
  Scenario: Validate shape-checks the omitted list of each UI contract screen
    Given a UI contract whose screens declare an `omitted` list or leave it out
    When `qfai validate` runs the contract checks
    Then a screen that writes no `omitted`, leaves it empty, or lists only entries with a non-blank `part` and `reason` raises nothing
    And each list that is not a list, entry that is not a mapping and entry with no `part` or no `reason` raises `QFAI-CONTRACT-052` at error, naming the contract, the screen and the defect

  # AC-0001-0039-07
  Scenario: Validate warns about an application screen that declares no states or no navigation
    Given a UI contract whose screens declare `states` and `navigation` or leave them out
    When `qfai validate` runs the contract checks
    Then an application screen with no `states`, or without one of the five state ids, raises `QFAI-CONTRACT-053` at warning
    And an application screen with no `navigation`, and no `navigation.none` with a reason, raises `QFAI-CONTRACT-054` at warning
    And a `surface: marketing` screen and the shipped UI contract sample raise neither
```
