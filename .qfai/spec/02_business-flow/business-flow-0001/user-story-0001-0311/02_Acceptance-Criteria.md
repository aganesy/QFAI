# Acceptance Criteria

## Criteria

```gherkin
Feature: Check every route of the built app for accessibility
  # AC-0001-0311-01
  Scenario: Validate warns about a UI project with no accessibility check
    Given a project whose UI contracts declare a screen with a route that starts with `/`
    When `qfai validate` runs the verify or full profile and no selected test file names axe
    Then it reports `QFAI-AXE-001` at warning
    And it reports nothing once a selected test file names axe, for a project with no such screen, or in a partial profile

  # AC-0001-0311-02
  Scenario: The shipped steps write, run and note the accessibility check
    Given a project whose UI contracts declare a screen with a route that starts with `/`
    When `implement-scaffold`, `verify-repo-gate` and `verify-qfai-gate` run as the shipped assets say
    Then the scaffold installs `@axe-core/playwright` as a dev dependency and writes the spec from the shipped template
    And the repository gate runs it through the `Test` command and fails on a violation the spec does not waive with a reason
    And the QFAI gate records whether the layer exists
```
