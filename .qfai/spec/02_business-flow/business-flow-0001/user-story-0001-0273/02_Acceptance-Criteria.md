# Acceptance Criteria

## Criteria

```gherkin
Feature: Compare first-iteration variants before I choose a direction
  # AC-0001-0273-01
  Scenario: An open direction gets variants on the first iteration
    Given a whole-product `prototype` run whose `.qfai/prototype/grilling.md` `## Session` settles neither how the in-scope screens should feel nor which layout carries their task
    When the loop builds the run's first iteration
    Then that iteration holds two or three variants of the in-scope screens on one page, switchable in place
    And the variants differ in grouping, layout or navigation, not only in style, and all use the root `DESIGN.md` tokens
    And each variant has its own review

  # AC-0001-0273-02
  Scenario: The user chooses, and the loop narrows to one prototype
    Given a reviewed first iteration with variants
    When it is put to the user as one comparison
    Then the user picks one, combines parts, or rejects all, and neither the agent nor a score picks
    And the iteration with variants is never the confirmed prototype
    And the next iteration builds one prototype from that answer, and every later iteration stays one prototype

  # AC-0001-0273-03
  Scenario: A settled direction gets one prototype
    Given a restyle, a run scoped to a confirmed prototype, or a `## Session` row that settles how the in-scope screens feel or which layout carries their task
    When the loop builds the run's first iteration
    Then it builds one prototype as before, with no variants
```
