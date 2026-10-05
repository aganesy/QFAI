# Acceptance Criteria

## Criteria

```gherkin
Feature: Settle one visual decision as a stage of a route
  # AC-0001-0204-02
  Scenario: The prototyping skill lists the steps the plans run for prototyping
    Given the qfai-prototyping SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-prototyping
    And every step a plan gives a prototype stage is one of them

  # AC-0001-0204-03
  Scenario: A prototype stage stays inside the flow its route is for
    Given a prototype stage of a route for one business flow with a UI-bearing contract
    When qfai-prototyping runs in it
    Then it settles the one visual decision the plan needs for that flow within the existing root DESIGN.md and UI contracts
    And it changes no UI contract of another flow and creates no contract
    And a standalone invocation still resolves every UI-bearing contract

  # AC-0001-0204-04
  Scenario: A prototype stage on a flow with no UI-bearing contract stops
    Given a prototype stage of a route for a business flow no UI-bearing contract serves
    When qfai-prototyping runs in it
    Then it writes nothing
    And the session stops, naming the missing UI surface
```
