# Acceptance Criteria

## Criteria

```gherkin
Feature: Run all package tests in manual Windows CI
  # AC-0002-0027-01
  Scenario: The manual request identifies the current pull request head
    Given a manual dispatch supplies a positive pull request number and a full forty-hex SHA
    When the diagnostic checks identity before installation and immediately before test execution
    Then the live pull request head and the checkout commit must both equal the requested SHA
    And missing, invalid, changed or unavailable identity stops execution
    And the two observations do not guarantee an atomic snapshot or that the remote head stays fixed afterward

  # AC-0002-0027-02
  Scenario: The diagnostic uses trusted setup and bounded read-only permissions
    Given the diagnostic is dispatched from the repository default branch
    When it checks out the requested head and prepares the job
    Then the workflow and shared setup come from the fixed trusted workflow commit rather than the requested pull request
    And a dispatch from another branch is refused
    And inputs pass through environment values and argument arrays without shell interpolation or selectable commands
    And the native Windows job has a declared bounded timeout, contents-read permissions, pinned actions and checkout credential persistence disabled
    And the GitHub token and repository secrets are not supplied to the test process

  # AC-0002-0027-03
  Scenario: Native Windows executes every current workspace project
    Given identity and trusted setup checks have passed
    When shared setup, the checkout package build and repository-owned canonical assistant mirror preparation complete
    Then the package `test` script runs real Vitest on native Windows without project or file filtering
    And every current workspace project is included
    And it uses no narrowed corpus or added retries
    And test cases, assertions, test-level timeouts and runner parallelism remain unchanged

  # AC-0002-0027-04
  Scenario: The result preserves observed counts, duration and failures
    Given the diagnostic attempts setup, build and full-suite execution
    When it records the result
    Then success requires a successful runner result, more than zero executed suite cases and execution of the specific full-flow test
    And setup, build, runner, zero-case or timeout failure cannot report success
    And available raw logs and result evidence are retained as an artifact including on failure
    And the evidence identifies the requested and observed SHA, trusted workflow commit and run without credentials
    And it records whole-suite executed counts, outcomes and elapsed time plus the specific full-flow test's executed result and duration
    And missing, interrupted or unexecuted full-flow evidence is marked unverified instead of replaced by a successful result

  # AC-0002-0027-05
  Scenario: Optional diagnosis leaves normal CI and execution evidence separate
    Given the exact-file and Windows full-suite diagnostics are optional manual workflows
    When the full-suite workflow is registered, dispatched or remains unexecuted
    Then only a subsequent actual dispatched run at an identified current pull request head supplies Windows execution evidence
    And workflow registration or a passing infrastructure pull request alone supplies no such evidence
    And the Windows execution evidence task remains open until an actual dispatched full-suite result and the specific full-flow test's executed result and duration are available
    And the regular full matrix, normal Windows parity, required inventory, contexts, aggregate and sole pull-request-triggered workflow remain unchanged
    And the diagnostic is not shipped and does not become a required status context or substitute for a required check
    And layer separation stays inside the existing own-CI workflow
    And one successful run or a subset result establishes neither the historical failure cause nor the duration of other runs
```
