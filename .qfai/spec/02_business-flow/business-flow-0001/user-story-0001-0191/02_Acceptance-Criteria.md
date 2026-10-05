# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a typo directly
  # AC-0001-0191-01
  Scenario: A typo is fixed through the text-edit route
    Given a change confirmed to alter no behaviour, story, setting or contract
    When `plan` routes it
    Then `qfai-maintain` makes the edit inside the scope and returns the diff, the no-behaviour-change judgement, an independent review and the lint and link checks
    And a full verify follows

  # AC-0001-0191-02
  Scenario: Excluded changes never take the text-edit route
    Given a change to a dependency, a workflow file, an authorization condition, an environment setting, SQL, a generated file, a normative README command, or QFAI's own skills or rules
    When `plan` routes it
    Then the route is not `edit-text`
    And a semantic effect found during an `edit-text` route stops the route before the edit
```
