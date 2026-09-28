# Acceptance Criteria

## Criteria

```gherkin
Feature: Item Completion Gate
  # AC-0001-0094-01
  Scenario: Completion Gate Enforcement
    Given an implemented EX with test-first, RED, GREEN and refactor evidence
    When checking completion
    Then qa-gatekeeper has confirmed RED and GREEN
    And completion-reviewer and implementation-reviewer have each returned PASS
    And checkpoint verification has passed without writing a ledger status.

  # AC-0001-0094-02
  Scenario: Fresh Evidence Required
    Given a TDD item
    When evidence is checked
    Then both RED and GREEN evidence include exact command + result; status-only evidence is rejected.

  # AC-0001-0094-03
  Scenario: Completed Items Skipped
    Given every EX in scope is annotated by a test or exempted by a `Test exception:` row in force
    And the scoped `tdd` validate result is current
    When `/qfai-implement` runs
    Then it reports "nothing to do" and exits

  # AC-0001-0094-04
  Scenario: Scoped Validate Gate Runs Per Business Flow
    Given a project on the story tree
    When `/qfai-implement` runs a checkpoint verification or its completion gate
    Then the scoped validate run is `qfai validate --profile tdd --fail-on error --flow BF-NNNN` for the flow the invocation owns, and it runs no `--spec` validation.

  # AC-0001-0094-05
  Scenario: Stale or missing validation blocks completion
    Given every EX in scope is annotated or exempted
    And the scoped validate result is missing, stale, or from a profile other than `tdd`
    When `/qfai-implement` checks completion
    Then it stops and reports the validate command, exit code and output
    And it does not report "nothing to do"
```
