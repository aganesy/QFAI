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
    Given the shipped test layers rule, the `implement-scaffold`, `implement-acceptance` and `implement-tdd` steps and the implementation reviewer
    When a test that drives a browser is written or reviewed
    Then the rule says to locate an element by what a user perceives (accessible role and name, label or visible text) or by a declared `data-qfai` marker, never by class name, CSS value or DOM path
    And it says to check a root `DESIGN.md`'s design tokens in a test of their own, not as CSS values in behaviour cases
    And it says to inject a failure by intercepting the network request or through a test-only fault seam that a production build does not carry, never through a module file the page loads
    And each step points to that section, and the reviewer flags a browser test that reroutes or replaces an application module file or reads a global such a module sets, and a behaviour case that asserts a CSS value
```
