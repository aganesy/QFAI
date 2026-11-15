# Acceptance Criteria

## Criteria

```gherkin
Feature: E2E Acceptance Test Implementation
  # AC-0001-0068-01
  Scenario: E2E Coverage Obligation on the story tree
    Given a BF in scope
    When the ATDD E2E implementer runs
    Then the BF has an E2E test file under `<testsDir>/e2e/**` carrying `QFAI:BF-NNNN`.

  # AC-0001-0068-02
  Scenario: Browser tests survive a rebuild that keeps the behaviour
    Given the shipped test layers rule, the `implement-acceptance` step and the implementation reviewer
    When an acceptance test that drives a browser is written or reviewed
    Then the rule says to locate an element by accessible role and name or by a declared `data-qfai` marker, never by class name, CSS value or DOM path
    And it says to check design tokens once against `DESIGN.md`, not as CSS values in behaviour cases
    And it says to inject a failure by intercepting the network request or through a test-only fault seam, never through a module file the page loads
    And the step points to that section, and the reviewer flags a browser test that imports or reroutes an application module
```
