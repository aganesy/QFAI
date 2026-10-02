# Acceptance Criteria

## Criteria

```gherkin
Feature: Repair a defective test with example coverage untouched
  # AC-0001-0187-01
  Scenario: A defective test is fixed with example coverage untouched
    Given diagnosis returns the defective-test verdict
    When the `test_fix` stage returns its result
    Then the test-fix step of the layer the first matched ID names repairs the test, and the other test-fix step passes
    And the result is accepted with every example still annotated as before

  # AC-0001-0187-02
  Scenario: A test fix that changes the expectation goes back to story authoring
    Given a `test_fix` result whose cited criterion or rule differs before and after the fix
    When the result is submitted
    Then `accept` refuses it, naming `qfai-sdd` as the owner of the fix
    And the run is unchanged

  # AC-0001-0187-03
  Scenario: A test fix without its review or re-run is refused
    Given a `test_fix` result missing the independent review or the re-run receipt
    When the result is submitted
    Then `accept` refuses it
    And the obligation set stays as it was

  # AC-0001-0187-04
  Scenario: A review counts only from an instance the run has not recorded as author or recommender
    Given stage results that name their `actor`
    When a later result is reviewed
    Then every work order's `actorHistory` holds the recorded authors, recommenders and reviewers
    And a review by the result's own `actor`, an author or a recommender is refused, and a result with no `actor` is refused
```
