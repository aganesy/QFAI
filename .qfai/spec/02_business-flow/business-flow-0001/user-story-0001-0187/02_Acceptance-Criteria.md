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
```
