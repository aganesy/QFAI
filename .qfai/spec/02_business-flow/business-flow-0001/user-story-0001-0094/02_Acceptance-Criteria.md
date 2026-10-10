# Acceptance Criteria

## Criteria

```gherkin
Feature: Item Completion Gate
  # AC-0001-0094-03
  Scenario: Completed Items Skipped
    Given every EX in scope is annotated by a test or exempted by a `Test exception:` row in force
    And the scoped `tdd` validate result is current
    When `/qfai-implement` runs
    Then it reports "nothing to do" and exits

  # AC-0001-0094-04
  Scenario: Scoped Validate Gate Runs Per Business Flow
    Given a project on the story tree
    When `/qfai-implement`, invoked by name, runs its completion gate
    Then its one validate run is `qfai validate --profile tdd --fail-on error --flow BF-NNNN` for the flow the invocation owns.
```
