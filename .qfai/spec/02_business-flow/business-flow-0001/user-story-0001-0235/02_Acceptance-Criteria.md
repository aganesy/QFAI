# Acceptance Criteria

## Criteria

```gherkin
Feature: Redirect observable exploratory searches through hooks

  # AC-0001-0235-01
  Scenario: Deny direct exploration before execution
    Given a supported host with an active denial adapter
    When an agent invokes a direct exploratory shell or native search
    Then the search effect is prevented and a relevant graph CLI command and bounded pending attempt ID are shown

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
  Scenario: Limit AI-decided search fallback
    Given a valid pending denial attempt and the AI's unresolved question and reason
    When the fallback CLI attempts the relevant graph and the adapter evaluates a subsequent search
    Then only the observed target, operation, worktree and session are permitted for 60 seconds without human approval, with no external document authorization or manual scope override

  # AC-0001-0235-05
  Scenario: Distinguish configuration from verified protection
    Given the initial host families and their trust requirements
    When I inspect integration status
    Then each host reports its own configured, trust-required, runtime-verified, unsupported or failed state

  # AC-0001-0235-06
  Scenario: Fail safely without analysis in hooks
    Given a supported pre-tool event
    When the hook denies search or cannot apply valid enforcement
    Then direct exploration is not automatically allowed, invalid fallback state grants nothing and the hook performs no graph query, preparation, network or model call
```
