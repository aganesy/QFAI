# Acceptance Criteria

## Criteria

```gherkin
Feature: Redirect observable exploratory searches through hooks

  # AC-0001-0235-01
  Scenario: Deny direct exploration before execution
    Given a supported host with an active denial adapter
    When an agent invokes a direct exploratory shell or native search
    Then the search effect is prevented and a relevant graph operation is suggested

  # AC-0001-0235-02
  Scenario: Classify command positions and supported compositions
    Given a supported shell composition
    When the adapter classifies its command
    Then wrappers and pipelines do not exempt direct exploration and incidental quoted words do not trigger denial

  # AC-0001-0235-03
  Scenario: Permit known reads and internal operations
    Given a known-file read or an ordinary quality or graph-engine operation
    When the agent executes it
    Then it remains usable without permitting general exploration

  # AC-0001-0235-04
  Scenario: Limit human-approved exceptions
    Given an exception specifying target, operation, reason, worktree, session and expiry
    When the adapter evaluates a search
    Then only explicitly human-approved matching scope is permitted before expiry

  # AC-0001-0235-05
  Scenario: Distinguish configuration from verified protection
    Given the initial host families and their trust requirements
    When I inspect integration status
    Then each host reports its own configured, trust-required, runtime-verified, unsupported or failed state

  # AC-0001-0235-06
  Scenario: Fail safely without analysis in hooks
    Given a supported pre-tool event
    When the hook denies search or cannot apply valid enforcement
    Then direct exploration is not automatically allowed and the hook does not process analysis
```
