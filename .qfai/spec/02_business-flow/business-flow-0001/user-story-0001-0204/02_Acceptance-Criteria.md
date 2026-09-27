# Acceptance Criteria

## Criteria

```gherkin
Feature: Author acceptance tests as a stage of a run
  # AC-0001-0204-01
  Scenario: The acceptance stage follows the stage-skill handover
    Given workflow mode active
    When /qfai-atdd is selected with no work order and not by name
    Then it edits nothing and passes the request to qfai-run
    And a worker handed a work order checks the run, stage and work-order IDs and does only that work, scoped to the flow the work order binds

  # AC-0001-0204-02
  Scenario: qfai-atdd lists the steps the plans run for acceptance
    Given the qfai-atdd SKILL.md and the built-in plans
    When its steps frontmatter is read
    Then it lists every step whose owner is qfai-atdd
    And every step a plan gives an acceptance stage, and the acceptance-layer step of a test_fix stage, is one of them

  # AC-0001-0204-03
  Scenario: Only a failure at the intended assertion is reported as RED
    Given an acceptance test written for the work order
    When the test fails at its intended assertion
    Then the stage result is accepted with the test observation expected_red and the failure kind assertion
    And a collection, import, start-up or timeout failure is reported unrun or blocked, never expected_red

  # AC-0001-0204-04
  Scenario: A pass with findings another flow owns is reported as accepted with debt
    Given the scoped ATDD gate passed for the bound flow with named findings that another flow owns
    When the stage returns its result
    Then the outcome is accepted_with_debt
    And each such finding is one debt naming its owning flow and its resolving owner
    And a residual finding with no named owner is never handed on as a debt

  # AC-0001-0204-05
  Scenario: A test that cannot reach its assertion takes the seam round trip first
    Given an acceptance test that cannot reach its assertion because a route, export or module is missing
    When the acceptance stage returns
    Then the result is needs_repair with a seam request naming that test
    And once the seam-only result is accepted, the same acceptance stage instance takes RED at the assertion
    And only then is the full implementation handed on
    And the round trip starts no other run and uses the skill's existing red-provenance branch

  # AC-0001-0204-06
  Scenario: The layer decision is never served from the shared snapshot
    Given an active run whose shared preflight snapshot is valid
    When the acceptance stage starts
    Then it may reuse the snapshot for the inputs the snapshot covers
    And it decides which acceptance layer each BF and AC of the bound flow needs from the current story tree
```
