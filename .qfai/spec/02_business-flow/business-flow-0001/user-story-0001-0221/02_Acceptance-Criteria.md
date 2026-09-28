# Acceptance Criteria

## Criteria

```gherkin
Feature: Judge the router against labelled requests before a release
  # AC-0001-0221-01
  Scenario: The seeds cover every route without copying another project's text
    Given the route evaluation seed fixture
    When it is checked
    Then every route has seeds, each thin route topped up to its floor by hand
    And a seed from another project's tracker holds a rewritten request and the source item's ID, never the original text

  # AC-0001-0221-02
  Scenario: The evaluation passes only above its agreement thresholds
    Given a manual evaluation run before a release
    When the routes the extraction leads to are scored against the seeds
    Then it passes only when at least 85% of routes and 95% of families match

  # AC-0001-0221-03
  Scenario: Every boundary pair lands on the right side
    Given seed pairs on both sides of each one-fact boundary between routes
    When they are scored
    Then each lands on its own side or on a route no lighter

  # AC-0001-0221-04
  Scenario: No safety seed is missed
    Given the safety seeds
    When they are scored
    Then a security request always reaches the vulnerability route, a data-loss or silent one always carries heavy review, and a low-confidence one always carries the user gate
    And one miss fails the evaluation

  # AC-0001-0221-05
  Scenario: Every re-routing seed reaches its declared destination
    Given a seed that gives a branch point's outcome
    When it is scored
    Then the run reaches the destination the branch point declares
```
