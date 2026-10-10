# Acceptance Criteria

## Criteria

```gherkin
Feature: Run one pull request test file in manual CI
  # AC-0002-0026-01
  Scenario: Manual inputs identify the current pull request head
    Given a manual diagnostic accepts a pull request number, a full commit SHA, one project and one exact package-relative test file
    When it validates the request before installing dependencies
    Then the number and SHA must be valid and the live pull request head must equal the requested SHA
    And the checkout must contain that exact commit
    And an unavailable or mismatched identity stops the diagnostic
    And inputs pass through environment values and argument arrays without shell interpolation
    And the job has a declared bounded timeout, contents-read token permissions, pinned actions and checkout credential persistence disabled
    And the GitHub token and repository secrets are not supplied to the test process

  # AC-0002-0026-02
  Scenario: One tracked regular file belongs to the selected project
    Given the project is core, unit, validators, integration, e2e, cli or scripts
    When the diagnostic checks the exact file before installation and before execution
    Then the file must be tracked at the selected head and included by the selected project's current include patterns
    And it must be a normal file inside the package with no linked parent or leaf
    And an absolute, traversing, untracked, missing, linked or out-of-project path stops the diagnostic
    And a project name denotes a Vitest project without adding a QFAI test layer

  # AC-0002-0026-03
  Scenario: The diagnostic runs real tests and keeps failures
    Given input and file checks have passed
    When the shared setup installs dependencies and the normal build required by the selected tests completes
    Then the real Vitest runner executes only the selected project and file
    And success requires at least one executed test case and a successful runner result
    And zero executed cases, setup failure, build failure, runner failure or timeout cannot report success
    And the result identifies the requested SHA, project and file without exposing credentials

  # AC-0002-0026-04
  Scenario: A moved head stops execution
    Given the initial identity check passed
    When the diagnostic is ready to start the test runner
    Then it reads the live pull request head again and checks the checkout commit again
    And unavailable data or a difference from the requested SHA stops execution
    And this check does not guarantee that the remote head stays fixed after the observation

  # AC-0002-0026-05
  Scenario: Manual diagnosis leaves required CI unchanged
    Given the repository has one general manual diagnostic workflow
    When that diagnostic succeeds, fails or is not dispatched
    Then the regular full test matrix, required inventory and aggregate verdict keep their existing jobs, conditions and dependencies
    And no diagnostic result substitutes for a required result or becomes a required status context
    And layer separation remains inside the existing own-CI workflow with no new workflow file per layer
```
