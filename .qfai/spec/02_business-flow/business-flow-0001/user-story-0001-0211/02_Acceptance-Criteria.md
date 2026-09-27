# Acceptance Criteria

## Criteria

```gherkin
Feature: Settle one visual decision as a stage of a run
  # AC-0001-0211-01
  Scenario: The prototyping skill follows the stage-skill handover
    Given workflow mode active
    When qfai-prototyping starts with no name invocation and no work order
    Then it edits nothing and passes the request to qfai-run
    And with a valid work order it does only that work

  # AC-0001-0211-02
  Scenario: The prototyping skill lists the steps the plans run for prototyping
    Given the qfai-prototyping SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-prototyping
    And every step a plan gives a prototype stage is one of them

  # AC-0001-0211-03
  Scenario: A prototype stage stays inside the flow its work order binds
    Given a prototype work order whose target binds one business flow with a UI-bearing contract
    When qfai-prototyping runs under it
    Then it settles the one visual decision the plan needs for that flow within the existing root DESIGN.md and UI contracts
    And it changes no UI contract of another flow and creates no contract
    And a standalone invocation still resolves every UI-bearing contract

  # AC-0001-0211-04
  Scenario: A prototype stage on a flow with no UI-bearing contract is blocked
    Given a prototype work order whose target binds a business flow no UI-bearing contract serves
    When qfai-prototyping runs under it
    Then it writes nothing
    And it returns outcome blocked with the missing UI surface as a debt the operator resolves
```
