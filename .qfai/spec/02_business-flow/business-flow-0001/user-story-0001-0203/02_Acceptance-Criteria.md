# Acceptance Criteria

## Criteria

```gherkin
Feature: Fix a defective test with its coverage untouched
  # AC-0001-0203-01
  Scenario: A test fix leaves example coverage untouched
    Given diagnosis found a defective existing test that checks a BF, an AC or an EX
    When /qfai-implement fixes the test in a test_fix stage
    Then the fix names the ID the expectation checks before and after it, and the test is re-run
    And the fixed test annotates the same IDs it annotated before the fix
    And no story, contract or decisions.md file changes

  # AC-0001-0203-02
  Scenario: A fix that changes the expectation's meaning goes back to SDD
    Given a test fix after which the expectation would check a different ID
    When the implement stage returns
    Then the fix is not made
    And the session stops and names qfai-sdd as the owner of the change

  # AC-0001-0203-03
  Scenario: Implement takes a test fix at every layer
    Given a diagnosis with the verdict defective-test
    When the first ID it matches is a BF, an AC or an EX
    Then `implement-test-fix` repairs the test in the test-fix stage
```
