# Acceptance Criteria

## Criteria

```gherkin
Feature: Verify as the final stage of a route
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
    And the verify block of every change route names `verify-qfai-gate`, `verify-repo-gate` and `verify-commit`, in that order, after a stage running `verify-change-note`, and every other verify stage names steps from that list

  # AC-0001-0208-08
  Scenario: The verify report records what ran apart from what is covered
    Given a verify run whose human report cites test runner results
    When the report is written
    Then it records, for each layer the gates ran, the revision and the CI run and attempt, the deployed source and its difference from that revision, the runner, command and per-layer counts with their report files, each skip with its reason, whether each layer ran fresh or was restored from a cache, each retried case once with its final outcome, and support cases apart from behavior cases
    And a count no report establishes is UNKNOWN, and a layer that did not run, whose report is missing or that collected no cases is UNRUN with its reason, never a pass
    And semantic coverage of a requirement is reported apart from the run report, so a passing annotated test does not mark a requirement covered
    And no JSON field, gate status, parser or runner is added
```
