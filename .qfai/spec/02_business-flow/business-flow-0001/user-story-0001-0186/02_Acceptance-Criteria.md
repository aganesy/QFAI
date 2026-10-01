# Acceptance Criteria

## Criteria

```gherkin
Feature: Repair a bug the stories already describe without uncovering an example
  # AC-0001-0186-01
  Scenario: A missing test is written against the example that states the case
    Given diagnosis returns the missing-test verdict
    When the plan continues
    Then when an example already states the case, `sdd-story` in the append stage passes citing it, and acceptance or implement writes its test
    And when no example states it, `sdd-story` appends one, carrying the diagnosis as the reason
    And the acceptance stage, the implement stage and a full verify follow

  # AC-0001-0186-02
  Scenario: A regression caught by an existing test is fixed against its covered example
    Given diagnosis returns the regression verdict for an example a test annotates
    When the plan continues
    Then the run re-routes to the route whose `regression_fix` stage fixes it, then a full verify
    And the example stays annotated
    And the fix is accepted only with the same test's GREEN re-run and an independent review

  # AC-0001-0186-03
  Scenario: No stage uncovers an example or adds one it does not own
    Given a fix run over a flow whose covering example a test annotates
    When a stage result leaves that example with no annotating test, or adds an example from a stage other than story authoring
    Then `accept` refuses the result
    And the obligation set is unchanged

  # AC-0001-0186-04
  Scenario: A different expectation is decided before anything is built
    Given a bug report whose stated expectation differs from the stories, or that no story covers
    When routing or diagnosis reaches that finding
    Then routing takes a feature route, or diagnosis re-routes the run to the acceptance decision, before any edit
    And no unfinished obligation is dropped by the re-route
```
