# Acceptance Criteria

## Criteria

```gherkin
Feature: Shipped workflow hardening
  # AC-0002-0001-01
  Scenario: Shipped workflows are bounded and least-privileged
    Given the shipped workflow set under `packages/qfai/assets/init/root/.github/workflows/`
    When the job definitions and the checkout steps of each file are inspected
    Then every job has `timeout-minutes` and a job-reachable `permissions:` block with the minimum scope it needs, and the orchestrator's verdict job has an empty permission map
    And every file declares a ref-scoped `concurrency:` group with `cancel-in-progress: true`
    And every checkout step sets `persist-credentials: false`
    And any artifact upload is skipped on cancellation, tolerates missing files and keeps retention at 7 days or less

  # AC-0002-0001-02
  Scenario: Distributed header respects the supported Node floor
    Given the package `engines` declaration and the headers of all shipped workflows
    When the headers are inspected
    Then no header claims a Node support floor that the package does not declare
```
