# Acceptance Criteria

## Criteria

```gherkin
Feature: Repair a bug the stories already describe without uncovering an example
  # AC-0001-0186-01
  Scenario: A missing test is written against the example that states the case
    Given diagnosis returns the missing-test verdict, having reproduced the defect with a test that fails
    When the plan continues
    Then when an example already states the case, the implement stage annotates that test with it
    And when no example states it, the implement stage appends one without asking, carrying the diagnosis as the reason, unless it would contradict the specification, which goes to the user first
    And the implement stage makes the test pass, and a full verify follows

  # AC-0001-0186-02
  Scenario: A regression caught by an existing test is fixed against its covered example
    Given diagnosis returns the regression verdict for an example a test annotates
    When the plan continues
    Then the session re-routes to the route whose `regression_fix` stage fixes it, then a full verify
    And the example stays annotated
    And the fix is accepted only with the same test's GREEN re-run and an independent review

  # AC-0001-0186-04
  Scenario: A different expectation is decided before anything is built
    Given a bug report whose stated expectation differs from the stories, or that no story covers
    When planning or diagnosis reaches that finding
    Then a feature route is taken, or diagnosis moves the work to the design decision, before any edit
```
