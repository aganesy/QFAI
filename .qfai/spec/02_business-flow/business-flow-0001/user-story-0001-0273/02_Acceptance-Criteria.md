# Acceptance Criteria

## Criteria

```gherkin
Feature: Compare first-iteration variants before I choose a direction
  # AC-0001-0273-01
  Scenario: An open direction gets variants on the first iteration
    Given a whole-product `prototype` run, not under a no-question mode, where neither `.qfai/prototype/grilling.md` `## Session` nor the root `DESIGN.md` settles which layout carries the in-scope screens' task
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
    Given a restyle, a run scoped to a confirmed prototype, a run under a no-question mode, or a `## Session` row or the root `DESIGN.md` settling which layout carries the in-scope screens' task
    When the loop builds the run's first iteration
    Then it builds one prototype as before, with no variants
```
