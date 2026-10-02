# Acceptance Criteria

## Criteria

```gherkin
Feature: Resolve only the unsettled scope as a stage of a run
  # AC-0001-0199-01
  Scenario: A discussion stage does not re-ask a settled decision
    Given a discussion work order whose settled field lists the checked route proposal and the answered questions
    When the discussion stage runs
    Then it covers only the scope that settled leaves unresolved
    And it asks no question settled already answers

  # AC-0001-0199-02
  Scenario: The discussion skill follows the stage-skill handover
    Given workflow mode active
    When qfai-discussion starts with no name invocation and no work order
    Then it edits nothing and passes the request to qfai-run
    And with a valid work order it does only that work

  # AC-0001-0199-03
  Scenario: The discussion skill lists the steps the plans run for discussion
    Given the qfai-discussion SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-discussion
    And every step a plan gives a discussion stage is one of them
```
