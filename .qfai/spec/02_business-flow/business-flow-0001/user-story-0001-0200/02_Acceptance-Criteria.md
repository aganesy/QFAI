# Acceptance Criteria

## Criteria

```gherkin
Feature: Implement as a stage of a route
  # AC-0001-0200-01
  Scenario: The implement stage follows the stage-skill handover
    Given workflow mode active
    When /qfai-implement is selected not by name and outside a route
    Then it edits nothing and passes the request to qfai-run
    And as a stage of a route it runs only the steps the plan names

  # AC-0001-0200-02
  Scenario: qfai-implement lists the steps the plans and seam requests run
    Given the qfai-implement SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-implement, implement-seam included
    And every step a plan gives a diagnose, implement or regression_fix stage, and the example-layer step of a test_fix stage, is one of them
```
