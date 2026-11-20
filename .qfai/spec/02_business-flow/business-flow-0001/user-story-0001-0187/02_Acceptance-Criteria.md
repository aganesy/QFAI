# Acceptance Criteria

## Criteria

```gherkin
Feature: Repair a defective test with example coverage untouched
  # AC-0001-0187-01
  Scenario: A defective test is fixed with example coverage untouched
    Given diagnosis returns the defective-test verdict
    When the `test_fix` stage returns its result
    Then the one test-fix step repairs the diagnosed test, whichever layer the first matched ID names, and the test keeps its original annotation
    And the result is accepted with every example still annotated as before
```
