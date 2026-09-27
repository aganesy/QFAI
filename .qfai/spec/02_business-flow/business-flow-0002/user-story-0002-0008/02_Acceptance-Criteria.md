# Acceptance Criteria

## Criteria

```gherkin
Feature: Structural contract gate for the shipped set
  # AC-0002-0008-01
  Scenario: A drift from the declared shape fails the lint gate
    Given the declared expected shape of the shipped set, held in exactly one place in the test suite, which is the single source of its values so neither spec nor contract restates them
    When the gate runs on the clean shipped set, and `pnpm ci:lint` then runs with a divergent profile value and failure threshold planted
    Then the clean run exits 0 and the planted run exits 1 with failure code `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`. The expected shape pins all ten dimensions `CLI-0020` §5 fixes as a closed set (the file set / the header block / per job, the permissions, timeout and runner selector / per matrix, `fail-fast: false` / per lane, the subcommand, profile and fail-on threshold / the condition that governs whether a lane runs — its inertness condition and, for an aggregate lane, its always-run condition and exact `needs` list / the third-party allow-list / zero secrets / no reference between shipped files / per aggregate, the external check name it carries). A shape missing any one of them is a contract violation
    And the gate's invocation path appears in `pnpm ci:lint` and not in `pnpm ci:gate`
    And the ad-hoc shipped-workflow string assertions of the existing asset tests are subsumed and replaced, with their test-case references kept or re-registered
```
