# Acceptance Criteria

## Criteria

```gherkin
Feature: Verify as the final stage of a run
  # AC-0001-0208-06
  Scenario: The verify stage follows the stage-skill handover
    Given workflow mode active
    When /qfai-verify is selected not by name and outside a route
    Then it edits nothing and passes the request to qfai-run
    And as a stage of a route it runs only the steps the plan names

  # AC-0001-0208-07
  Scenario: qfai-verify lists the steps every verify stage runs
    Given the qfai-verify SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-verify
    And the verify block of every change route names `verify-qfai-gate` and `verify-repo-gate`, in that order, after a stage running `verify-change-note`, and every other verify stage names steps from that list
```
