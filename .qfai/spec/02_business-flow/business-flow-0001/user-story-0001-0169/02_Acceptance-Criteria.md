# Acceptance Criteria

## Criteria

```gherkin
Feature: Orchestrator Protocol

# AC-0001-0169-01
# Parent: US-0001-0169
Scenario: Orchestrator No Direct Generation
  Given an Orchestrator invocation
  When it processes work
  Then it delegates to sub-agents and does not generate primary artifact first drafts directly.

# AC-0001-0169-02
# Parent: US-0001-0169
Scenario: Capability Probe Uses Real Delegation
  Given a skill stage starts
  When the first required delegation is attempted
  Then that real delegation attempt acts as the capability check and no preflight availability confirmation gates execution.

# AC-0001-0169-03
# Parent: US-0001-0169
Scenario: Delegation Failure Hard Stop
  Given the first required delegation fails
  When the orchestrator handles the failure
  Then it classifies the failure as `unavailable` or `saturated` and no simulated or self-executed fallback is used in either class. An `unavailable` failure stops the stage immediately and the user receives failure reason, failure class, attempted role/task, remediation guidance, and retry condition. A `saturated` failure holds the stage open for a bounded retry of the identical delegation and falls through to the same hard-stop report once the retry budget is exhausted.
```
