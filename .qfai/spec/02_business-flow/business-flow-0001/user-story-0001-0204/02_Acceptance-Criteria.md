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

  # AC-0001-0204-05
  Scenario: A prototype stage researches only the screens the project has no pattern for
    Given a prototype stage of a route whose run adds screens no confirmed prototype covers
    When qfai-prototyping checks each added screen's type against the business UI patterns and each element and structure group its UI contract declares against the component catalogue
    Then it runs the research protocol, scoped to UI, for each screen type or component none of them covers, before the session
    And it runs no research when they cover every added screen

  # AC-0001-0204-06
  Scenario: The prototype loop builds and reviews from the UI research the grill recorded
    Given a prototype stage whose grill recorded a research summary for screen types or components the project does not cover
    When qfai-prototyping runs its loop
    Then the generator of each lineage reads the best practices and anti-patterns the grill applied for that lineage's gaps
    And the reviewer receives the same entries
    And a finding the grill rejected or deferred reaches neither
```
