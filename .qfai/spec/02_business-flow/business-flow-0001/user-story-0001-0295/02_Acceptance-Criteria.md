# Acceptance Criteria

## Criteria

```gherkin
Feature: Restyle my running screens without losing their data or what already works
  # AC-0001-0295-01
  Scenario: A restyle keeps the text its screens show
    Given a `restyle` loop whose session agent saved each in-scope live route's text as its baseline before iteration 00
    When the reviewer reviews a restyle iteration
    Then text in a route's baseline that the screen changes, drops or replaces with prose is a blocking finding naming the screen, the baseline text and what the screen shows instead
    And a missing baseline is a missing mandatory input

  # AC-0001-0295-02
  Scenario: A prototype takes its sample data from the examples
    Given a `prototype` run whose in-scope UI contract's rules cite examples
    When the generator builds an iteration
    Then the screens show the figures, names and values those examples give
    And a value no example gives is neutral, used the same way on every screen and listed in `progress.md`, and is never a metric, customer count, customer name or testimonial

  # AC-0001-0295-03
  Scenario: An audit sizes the restyle before any edit
    Given a `restyle` loop before iteration 00
    When the session agent audits the rendered live routes against the design anti-pattern list and root `DESIGN.md`
    Then it records `restyleLevel` as `full`, `polish` or `none` in `progress.md` and puts the audit and the level to the user before the first edit
    And every level stays within the root `DESIGN.md` tokens

  # AC-0001-0295-04
  Scenario: A screen that is already good stays as it is
    Given a restyle audit that found no pattern, so `restyleLevel` is `none`
    When the user accepts none of the refinements offered, or no user can answer
    Then the run stops before iteration 00 with no edit and no handoff
    And the final report says the screens were left as they were
    And when the user accepts some refinements, iteration 00 applies only those, as `progress.md` lists them

  # AC-0001-0295-05
  Scenario: A restyle edits the aspects a stylesheet reaches in a fixed order
    Given a `restyle` iteration
    When the generator edits the project's stylesheet and motion entry points
    Then it finishes spacing, color, type, layout, details and motion in that order, each across every screen in scope before the next, or plans them in that order and writes them in one pass
    And a change to displayed text, an icon, an image or the markup is reported as a change the contract needs, not made
```
